/**
 * Central NotificationService — single entry for all workflow emails.
 *
 * Always persists a notification record (Mock Inbox / delivery audit).
 * Calls the existing server `/api/email/workflow` SES path when EMAIL_MODE is
 * `ses` or `both`. Never imports AWS SDK (browser-safe).
 */

import type {
  MockEmail,
  UserSession,
  WorkflowEmailAction,
} from "@/data/auth-types";
import type { UnitOfWork } from "@/data/repositories/interfaces";
import { migrateEmailAddress } from "@/data/email-domain";

export type DeliveryResult = {
  ok: boolean;
  error?: string;
  email: MockEmail;
};

const SYSTEM_ACTOR: UserSession = {
  userId: "user-system-mailer",
  email: "admin@ppg-demo.com",
  name: "OneFlow Automation",
  role: "Admin",
  loggedInAt: new Date().toISOString(),
};

let notificationActor: UserSession | null = null;
let suppressAutoDeliver = false;
const hookedUows = new WeakSet<object>();

export function setNotificationActor(session: UserSession | null): void {
  notificationActor = session;
}

export function getNotificationActor(): UserSession {
  return notificationActor || SYSTEM_ACTOR;
}

function resolveDeliveryActor(session: UserSession | null): UserSession {
  const candidate = session || getNotificationActor();
  // Employee form submissions still create notifications; SES is sent as system mailer.
  if (
    candidate.role === "ONBOARDING_EMPLOYEE" ||
    candidate.role === "OFFBOARDING_EMPLOYEE"
  ) {
    return SYSTEM_ACTOR;
  }
  return candidate;
}

function log(...parts: unknown[]) {
  console.log("[Notification]", ...parts);
}

function logWorkflow(label: string) {
  console.log(`[Workflow] ${label}`);
}

function inferAction(email: MockEmail): WorkflowEmailAction {
  const t = (email.notificationType || "").toLowerCase();
  const subj = email.subject.toLowerCase();
  if (t.includes("laptop") && (t.includes("manager") || t.includes("decision"))) {
    return "sendLaptopDecisionEmail";
  }
  if (
    t.includes("laptop") ||
    subj.includes("purchase order") ||
    subj.includes("equipment preparation")
  ) {
    return "sendLaptopPurchaseOrderEmail";
  }
  if (t.includes("presenter") || t.includes("induction session")) {
    return "sendInductionPresenterAssignmentEmail";
  }
  if (t.includes("induction") || subj.includes("induction")) {
    return "sendInductionReviewEmail";
  }
  if (t.includes("access card") || subj.includes("access card")) {
    return "sendAccessCardReviewEmail";
  }
  if (t.includes("exit") || subj.includes("exit clearance")) {
    return "sendExitClearanceEmail";
  }
  if (t.includes("escalat") || subj.includes("escalat")) {
    return "sendEscalationEmail";
  }
  if (t.includes("reminder") || subj.includes("reminder")) {
    return "sendTaskReminderEmail";
  }
  if (
    subj.includes("completed") ||
    t.includes("completion") ||
    t.includes("assigned")
  ) {
    return "sendWorkflowCompletionEmail";
  }
  return "sendWorkflowCompletionEmail";
}

function openFormPathFor(email: MockEmail): string | null {
  if (email.relatedFormType === "Induction Checklist" && email.relatedFormId) {
    return `/oneflow/my-forms/induction/${email.relatedFormId}`;
  }
  if (
    email.relatedFormType === "Access Card Application" &&
    email.relatedFormId
  ) {
    return `/oneflow/my-forms/access-card/${email.relatedFormId}`;
  }
  if (
    (email.relatedFormType === "Exit Clearance Form" ||
      email.attachments?.some((a) => a.kind.startsWith("exit-clearance"))) &&
    (email.relatedFormId || email.attachments?.[0]?.formId)
  ) {
    const id = email.relatedFormId || email.attachments?.[0]?.formId;
    return `/oneflow/exit-clearance/${id}`;
  }
  if (email.relatedTaskId) {
    return `/oneflow/tasks/${email.relatedTaskId}`;
  }
  return "/oneflow/inbox";
}

function stamp(email: MockEmail): MockEmail {
  const to = migrateEmailAddress(email.to || "");
  const from = migrateEmailAddress(email.from || "");
  const cc = (email.cc || []).map(migrateEmailAddress);
  return {
    ...email,
    to,
    from,
    cc,
    deliveryMode: email.deliveryMode ?? null,
    provider: email.provider ?? "none",
    providerMessageId: email.providerMessageId ?? null,
    deliveryStatus: email.deliveryStatus ?? "Pending",
    deliveryAttemptCount: email.deliveryAttemptCount ?? 0,
    deliveredAt: email.deliveredAt ?? null,
    failedAt: email.failedAt ?? null,
    failureReason: email.failureReason ?? null,
    lastAttemptAt: email.lastAttemptAt ?? null,
    mappedRecipientMasked: email.mappedRecipientMasked ?? null,
  };
}

function workflowLabel(email: MockEmail): string {
  return (
    email.notificationType ||
    email.subject ||
    email.sourceType ||
    "Workflow notification"
  );
}

/**
 * Deliver one notification through Mock Inbox persistence + SES API.
 * Workflow callers must not await this for critical path success — SES failure
 * must not roll back task/form transactions.
 */
export async function deliverMockEmailWithProvider(
  uow: UnitOfWork,
  email: MockEmail,
  session: UserSession | null,
  options?: {
    forceResend?: boolean;
    action?: WorkflowEmailAction;
    skipIfAlreadySent?: boolean;
  }
): Promise<DeliveryResult> {
  const actor = resolveDeliveryActor(session);
  const label = workflowLabel(email);
  logWorkflow(label);
  log("Creating notification...", email.id, "→", email.to);

  suppressAutoDeliver = true;
  let working: MockEmail;
  try {
    const existing = uow.mockEmails.getById(email.id);
    working = stamp(existing ? { ...existing, ...email } : email);
    if (!existing) {
      uow.mockEmails.createMany([working]);
    } else {
      uow.mockEmails.update(working);
    }
    uow.persist();
  } finally {
    suppressAutoDeliver = false;
  }

  if (
    options?.skipIfAlreadySent !== false &&
    !options?.forceResend &&
    working!.deliveryStatus === "Sent" &&
    working!.providerMessageId
  ) {
    log("Already Sent — skipping duplicate", working!.providerMessageId);
    return { ok: true, email: working! };
  }

  try {
    log("Sending via AWS SES (server EMAIL_MODE)...");
    const res = await fetch("/api/email/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: options?.action || inferAction(working!),
        toMock: working!.to,
        ccMock: working!.cc || [],
        subject: working!.subject,
        htmlBody: working!.htmlBody,
        notificationId: working!.id,
        notificationType:
          working!.notificationType || options?.action || inferAction(working!),
        sourceType: working!.sourceType,
        sourceRecordId: working!.sourceRecordId || working!.id,
        openFormPath: openFormPathFor(working!),
        openFormLabel: "Open OneFlow Form",
        session: {
          email: actor.email,
          role: actor.role,
          name: actor.name,
        },
        forceResend: Boolean(options?.forceResend),
        previousProviderMessageId: working!.providerMessageId,
        previousDeliveryStatus: working!.deliveryStatus,
      }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      deliveryMode?: MockEmail["deliveryMode"];
      provider?: MockEmail["provider"];
      deliveryStatus?: MockEmail["deliveryStatus"];
      providerMessageId?: string | null;
      deliveryAttemptCount?: number;
      sentAt?: string | null;
      failedAt?: string | null;
      failureReason?: string | null;
      lastAttemptAt?: string;
      mappedRecipientMasked?: string | null;
      skippedDuplicate?: boolean;
    };

    working = {
      ...working!,
      deliveryMode: data.deliveryMode || working!.deliveryMode,
      provider: data.provider || working!.provider,
      deliveryStatus: data.deliveryStatus || working!.deliveryStatus,
      providerMessageId:
        data.providerMessageId ?? working!.providerMessageId ?? null,
      deliveryAttemptCount:
        (working!.deliveryAttemptCount || 0) + (data.deliveryAttemptCount || 1),
      deliveredAt: data.sentAt || working!.deliveredAt || null,
      failedAt: data.failedAt || null,
      failureReason: data.failureReason || null,
      lastAttemptAt: data.lastAttemptAt || new Date().toISOString(),
      mappedRecipientMasked:
        data.mappedRecipientMasked ?? working!.mappedRecipientMasked ?? null,
    };

    suppressAutoDeliver = true;
    try {
      uow.mockEmails.update(working);
      uow.persist();
    } finally {
      suppressAutoDeliver = false;
    }

    if (data.skippedDuplicate) {
      log("Duplicate suppressed by server");
      return { ok: true, email: working };
    }

    if (data.deliveryStatus === "Mock Only") {
      log("Delivery Successful (Mock Only — EMAIL_MODE=mock)");
      return { ok: true, email: working };
    }

    if (data.ok && data.deliveryStatus === "Sent") {
      log(`SES MessageId=${data.providerMessageId || "—"}`);
      log("Delivery Successful");
      return { ok: true, email: working };
    }

    log("SES failed");
    console.warn("[Notification] Reason:", data.error || data.failureReason);
    return {
      ok: false,
      error: data.error || data.failureReason || "Delivery failed",
      email: working,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Email API unreachable";
    log("SES failed");
    console.warn("[Notification] Reason:", message);
    working = {
      ...working!,
      deliveryMode: working!.deliveryMode || "both",
      provider: "ses",
      deliveryStatus: "Failed",
      failureReason: message,
      failedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      deliveryAttemptCount: (working!.deliveryAttemptCount || 0) + 1,
    };
    suppressAutoDeliver = true;
    try {
      uow.mockEmails.update(working);
      uow.persist();
    } finally {
      suppressAutoDeliver = false;
    }
    return { ok: false, error: message, email: working };
  }
}

/** Publish one or more notifications (sync create + async SES). */
export function publishNotifications(
  uow: UnitOfWork,
  emails: MockEmail[],
  session?: UserSession | null
): void {
  if (!emails.length) return;
  const actor = session === undefined ? resolveDeliveryActor(null) : resolveDeliveryActor(session);
  for (const email of emails) {
    const pending = stamp(email);
    // Ensure record exists immediately for Mock Inbox (EMAIL_MODE mock|both|ses audit)
    if (!uow.mockEmails.getById(pending.id)) {
      suppressAutoDeliver = true;
      try {
        uow.mockEmails.createMany([pending]);
      } finally {
        suppressAutoDeliver = false;
      }
    }
    void deliverMockEmailWithProvider(uow, pending, actor, {
      skipIfAlreadySent: true,
    }).catch((err) => {
      console.warn(
        "[Notification] Async delivery error (workflow continues):",
        err
      );
    });
  }
  uow.persist();
}

/** @deprecated Use publishNotifications — kept for AppService call sites */
export function queueWorkflowEmailDelivery(
  uow: UnitOfWork,
  emails: MockEmail[],
  session: UserSession | null
): void {
  publishNotifications(uow, emails, session);
}

/**
 * Install automatic delivery on every mockEmails.createMany for this UoW.
 * This is the choke point so Submit Form / Complete Task / etc. cannot bypass SES.
 */
export function installNotificationDelivery(uow: UnitOfWork): void {
  if (hookedUows.has(uow as object)) return;
  hookedUows.add(uow as object);

  const repo = uow.mockEmails;
  const originalCreateMany = repo.createMany.bind(repo);

  repo.createMany = (emails: MockEmail[]) => {
    const stamped = emails.map(stamp);
    originalCreateMany(stamped);
    if (suppressAutoDeliver || !stamped.length) return;

    for (const email of stamped) {
      logWorkflow(workflowLabel(email));
      log("Creating notification (auto-hook)...", email.id, "→", email.to);
      void deliverMockEmailWithProvider(uow, email, resolveDeliveryActor(null), {
        skipIfAlreadySent: true,
      }).catch((err) => {
        console.warn(
          "[Notification] Auto-hook delivery error (workflow continues):",
          err
        );
      });
    }
  };
}
