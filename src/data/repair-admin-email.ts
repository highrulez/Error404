/**
 * Repair stored records that still use administration@ppg-demo.com.
 * Does not resend SES emails — only rewrites simulated recipients / assignments.
 */

import type { UnitOfWork } from "@/data/repositories/interfaces";
import {
  ADMIN_MOCK_EMAIL,
  LEGACY_ADMINISTRATION_EMAIL,
  migrateEmailAddress,
} from "./email-domain";

const LEGACY = LEGACY_ADMINISTRATION_EMAIL.toLowerCase();
const CANONICAL = ADMIN_MOCK_EMAIL;

function isLegacy(email: string | null | undefined): boolean {
  return (email || "").trim().toLowerCase() === LEGACY;
}

function rewriteText(value: string): string {
  return value.replace(
    /(?<![A-Za-z0-9._%+-])administration@ppg-demo\.com/gi,
    CANONICAL
  );
}

export type AdminEmailRepairResult = {
  emailsRepaired: number;
  tasksRepaired: number;
  templatesRepaired: number;
  accessCardTasksRepaired: number;
  activityRepaired: number;
  duplicatesRemoved: number;
  messages: string[];
};

/**
 * Normalize administration@ → admin@ across persisted workflow data.
 * Idempotent; safe to run on every boot / before Retry Failed Email.
 */
export function repairAdministrationRecipientRecords(
  uow: UnitOfWork
): AdminEmailRepairResult {
  const messages: string[] = [];
  let emailsRepaired = 0;
  let tasksRepaired = 0;
  let templatesRepaired = 0;
  let accessCardTasksRepaired = 0;
  let activityRepaired = 0;
  let duplicatesRemoved = 0;

  // --- Mock emails / notifications ---
  const emails = uow.mockEmails.list();
  const nextEmails = emails.map((e) => {
    let changed = false;
    let to = e.to;
    let from = e.from;
    let cc = e.cc || [];
    let htmlBody = e.htmlBody || "";
    let subject = e.subject || "";

    if (isLegacy(to)) {
      to = CANONICAL;
      changed = true;
    } else {
      const migrated = migrateEmailAddress(to);
      if (migrated !== to) {
        to = migrated;
        changed = true;
      }
    }
    if (isLegacy(from)) {
      from = CANONICAL;
      changed = true;
    }
    const nextCc = cc.map((c) => migrateEmailAddress(c));
    if (nextCc.some((c, i) => c !== cc[i])) {
      cc = nextCc;
      changed = true;
    }
    const nextHtml = rewriteText(htmlBody);
    if (nextHtml !== htmlBody) {
      htmlBody = nextHtml;
      changed = true;
    }
    const nextSubject = rewriteText(subject);
    if (nextSubject !== subject) {
      subject = nextSubject;
      changed = true;
    }

    if (!changed) return e;
    emailsRepaired += 1;
    return {
      ...e,
      to,
      from,
      cc,
      htmlBody,
      subject,
      // Clear stale "no mapping for administration@" failure so Retry can succeed
      failureReason:
        e.failureReason &&
        /administration@ppg-demo\.com/i.test(e.failureReason)
          ? null
          : e.failureReason,
      mappedRecipientMasked:
        e.mappedRecipientMasked &&
        /administration/i.test(e.mappedRecipientMasked)
          ? null
          : e.mappedRecipientMasked,
    };
  });

  // Deduplicate Access Card admin notifications that share form + recipient + type
  const seenAccessCardKeys = new Map<string, string>();
  const dropIds = new Set<string>();
  const sorted = [...nextEmails].sort((a, b) =>
    (b.sentAt || "").localeCompare(a.sentAt || "")
  );
  for (const e of sorted) {
    const isAccessCardNotify =
      /access card/i.test(e.subject) ||
      /access card/i.test(e.notificationType || "") ||
      e.relatedFormType === "Access Card Application";
    if (!isAccessCardNotify) continue;
    if ((e.to || "").toLowerCase() !== CANONICAL) continue;
    const formKey = e.relatedFormId || e.sourceRecordId || "";
    if (!formKey) continue;
    const key = `${formKey}|${e.notificationType || e.subject}|${e.to.toLowerCase()}`;
    const existing = seenAccessCardKeys.get(key);
    if (existing && existing !== e.id) {
      dropIds.add(e.id);
      duplicatesRemoved += 1;
      continue;
    }
    seenAccessCardKeys.set(key, e.id);
  }

  const finalEmails = nextEmails.filter((e) => !dropIds.has(e.id));
  if (emailsRepaired || duplicatesRemoved) {
    uow.mockEmails.replaceAll(finalEmails);
    messages.push(
      `${emailsRepaired} notification(s) reassigned to ${CANONICAL}`
    );
    if (duplicatesRemoved) {
      messages.push(`${duplicatesRemoved} duplicate notification(s) removed`);
    }
  }

  // --- Tasks ---
  for (const t of uow.tasks.list()) {
    const emailChanged = isLegacy(t.assignedEmail);
    const ownerWasPriya =
      (t.assignedOwner || "").toLowerCase() === "priya nair" ||
      (t.assignedPersonName || "").toLowerCase() === "priya nair" ||
      (t.assignedUserName || "").toLowerCase() === "priya nair";
    if (!emailChanged && !ownerWasPriya) continue;

    const isAccessCard = Boolean(t.isAccessCardReviewTask);
    uow.tasks.update({
      ...t,
      assignedEmail: emailChanged ? CANONICAL : t.assignedEmail,
      ...(ownerWasPriya
        ? {
            assignedOwner: "Admin",
            assignedPersonName: "OneFlow Admin",
            assignedUserName: "Admin",
          }
        : {}),
    });
    tasksRepaired += 1;
    if (isAccessCard) accessCardTasksRepaired += 1;
  }
  if (tasksRepaired) {
    messages.push(`${tasksRepaired} task assignment(s) repaired`);
  }

  // --- Exit clearance templates ---
  const templates = uow.exitClearanceTemplates.list();
  let templatesChanged = false;
  const nextTemplates = templates.map((item) => {
    if (!isLegacy(item.fixedAssignedEmail || undefined)) return item;
    templatesChanged = true;
    templatesRepaired += 1;
    return { ...item, fixedAssignedEmail: CANONICAL };
  });
  if (templatesChanged) {
    uow.exitClearanceTemplates.replaceAll(nextTemplates);
    messages.push(`${templatesRepaired} exit clearance template(s) repaired`);
  }

  // --- Activity (safe text rewrite via replaceAll) ---
  const activity = uow.activity.list();
  const nextActivity = activity.map((a) => {
    const detail = a.detail || "";
    const nextDetail = rewriteText(detail);
    if (nextDetail === detail) return a;
    activityRepaired += 1;
    return { ...a, detail: nextDetail };
  });
  if (activityRepaired) {
    uow.activity.replaceAll(nextActivity);
    messages.push(`${activityRepaired} activity record(s) repaired`);
  }

  if (!messages.length) {
    messages.push("No administration@ records required repair");
  }

  return {
    emailsRepaired,
    tasksRepaired,
    templatesRepaired,
    accessCardTasksRepaired,
    activityRepaired,
    duplicatesRemoved,
    messages,
  };
}
