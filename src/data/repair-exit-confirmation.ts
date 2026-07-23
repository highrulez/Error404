import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import type { ChecklistTask } from "./types";
import type { EmployeeExitClearanceForm } from "./exit-clearance-types";
import { profileByEmail, initialsFromName } from "./demo-profiles";
import { findDemoUserByEmail } from "./auth-accounts";
import { migrateEmailAddress } from "./email-domain";
import {
  buildConfirmationTasks,
  exitActivity,
} from "./exit-clearance-engine";
import { normalizeUnifiedTask } from "./task-normalize";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Repair Exit Clearance ↔ Confirmation task linkage for existing demo data.
 * Idempotent: does not create duplicate tasks or activity when already synced.
 */
export function repairExitConfirmationData(
  uow: UnitOfWork,
  options?: { actor?: string; persist?: boolean }
): {
  repairedItems: number;
  createdTasks: number;
  warnings: number;
} {
  const actor = options?.actor ?? "OneFlow Data Repair";
  let repairedItems = 0;
  let createdTasks = 0;
  let warnings = 0;

  // 1) Completed confirmation tasks whose checklist items are still Pending
  for (const task of uow.tasks.list()) {
    const normalized = normalizeUnifiedTask(task);
    if (
      normalized.taskType !== "Confirmation" &&
      !normalized.isExitClearanceConfirmation
    ) {
      continue;
    }
    if (normalized.status !== "Completed") continue;

    const formId =
      normalized.linkedExitClearanceFormId || normalized.exitFormId;
    const itemId =
      normalized.linkedChecklistItemId || normalized.exitFormItemId;

    if (!formId || !itemId) {
      warnings += 1;
      uow.automationRuns.create({
        id: uid("run-repair-warn"),
        runNumber: `REPAIR-${Date.now().toString(36)}`,
        trigger: "Exit confirmation link missing",
        employeeId: normalized.employeeId,
        onboardingCaseId: normalized.offboardingCaseId || "",
        status: "Successful",
        startedAt: nowIso(),
        endedAt: nowIso(),
        durationMs: 0,
        tasksAssigned: 0,
        emailsGenerated: 0,
        errorMessage: `Warning: completed confirmation task ${normalized.id} (${normalized.title}) lacks linkedExitClearanceFormId / linkedChecklistItemId. Not auto-matched by title.`,
        steps: [
          {
            id: uid("step"),
            order: 1,
            name: "Link validation",
            status: "Failed",
            detail: "Missing link IDs — skipped title-based guessing",
            startedAt: nowIso(),
            completedAt: nowIso(),
          },
        ],
        simulateFailure: false,
      });
      // Backfill unified fields even when links missing
      if (!task.taskType) {
        uow.tasks.update(normalized);
      }
      continue;
    }

    const form = uow.exitClearanceForms.getById(formId);
    if (!form) continue;
    const item = form.checklistItems.find((i) => i.id === itemId);
    if (!item) continue;

    let nextTask = {
      ...normalized,
      linkedExitClearanceFormId: formId,
      linkedChecklistItemId: itemId,
      exitFormId: formId,
      exitFormItemId: itemId,
      isExitClearanceConfirmation: true,
      sourceType: "Exit Clearance Form" as const,
      sourceRecordId: itemId,
    };

    if (item.confirmationStatus === "Pending") {
      const completedByName =
        nextTask.completedByName ||
        (nextTask.completedBy
          ? profileByEmail(nextTask.completedBy)?.name ||
            findDemoUserByEmail(nextTask.completedBy)?.name
          : null) ||
        nextTask.assignedUserName ||
        "Unknown";
      const profile =
        profileByEmail(
          nextTask.completedBy || nextTask.assignedEmail || ""
        ) || findDemoUserByEmail(nextTask.completedBy || "");
      const initial =
        profile?.initials ||
        initialsFromName(completedByName);

      const nextItems = form.checklistItems.map((i) =>
        i.id === item.id
          ? {
              ...i,
              confirmationStatus: "Confirmed" as const,
              confirmationName: completedByName,
              confirmationInitial: initial,
              confirmationDate: (nextTask.completedAt || nowIso()).slice(0, 10),
              confirmationRemarks:
                i.confirmationRemarks || nextTask.remarks || nextTask.notes || "",
              linkedTaskId: nextTask.id,
            }
          : i
      );
      const nextForm: EmployeeExitClearanceForm = {
        ...form,
        checklistItems: nextItems,
        updatedAt: nowIso(),
      };
      uow.exitClearanceForms.update(nextForm);
      repairedItems += 1;

      nextTask = {
        ...nextTask,
        outcome: nextTask.outcome === "None" ? "Confirmed" : nextTask.outcome,
        completedByName,
        completedBy:
          nextTask.completedBy ||
          profile?.email ||
          nextTask.assignedEmail ||
          null,
      };
    } else if (!item.linkedTaskId) {
      const nextItems = form.checklistItems.map((i) =>
        i.id === item.id ? { ...i, linkedTaskId: nextTask.id } : i
      );
      uow.exitClearanceForms.update({
        ...form,
        checklistItems: nextItems,
        updatedAt: nowIso(),
      });
      repairedItems += 1;
    }

    uow.tasks.update(nextTask);
  }

  // 2) Pending confirmation-needed items without tasks
  for (const form of uow.exitClearanceForms.list()) {
    const employee = uow.employees.getById(form.employeeId);
    if (!employee) continue;
    const submitted = [
      "Submitted",
      "Confirmation In Progress",
      "Returned for Correction",
      "Fully Cleared",
      "Completed",
    ].includes(form.formStatus);
    if (!submitted) continue;

    const { tasks, updatedItems } = buildConfirmationTasks({ form, employee });
    if (tasks.length) {
      uow.tasks.createMany(tasks);
      createdTasks += tasks.length;
      uow.exitClearanceForms.update({
        ...form,
        checklistItems: updatedItems,
        updatedAt: nowIso(),
      });
    } else {
      // Ensure linkedTaskId points to existing tasks by item id
      let changed = false;
      const nextItems = form.checklistItems.map((item) => {
        if (item.confirmationStatus === "Not Required") return item;
        if (item.linkedTaskId && uow.tasks.getById(item.linkedTaskId)) {
          return item;
        }
        const existing = uow.tasks
          .list()
          .find(
            (t) =>
              (t.linkedChecklistItemId === item.id ||
                t.exitFormItemId === item.id) &&
              (t.taskType === "Confirmation" || t.isExitClearanceConfirmation)
          );
        if (existing) {
          changed = true;
          return { ...item, linkedTaskId: existing.id };
        }
        return item;
      });
      if (changed) {
        uow.exitClearanceForms.update({
          ...form,
          checklistItems: nextItems,
          updatedAt: nowIso(),
        });
        repairedItems += 1;
      }
    }
  }

  // 3) Normalize all tasks with unified fields
  for (const task of uow.tasks.list()) {
    const n = normalizeUnifiedTask(task);
    if (
      n.taskType !== task.taskType ||
      n.linkedExitClearanceFormId !== task.linkedExitClearanceFormId ||
      n.outcome !== task.outcome
    ) {
      uow.tasks.update(n);
    }
  }

  if (repairedItems || createdTasks || warnings) {
    const sampleEmp =
      uow.employees.list().find((e) => e.email.includes("daniel")) ||
      uow.employees.list()[0];
    if (sampleEmp) {
      const existing = uow.activity
        .list()
        .some(
          (a) =>
            a.action === "Exit confirmation data repaired" &&
            a.detail.includes(`repaired=${repairedItems}`)
        );
      if (!existing) {
        uow.activity.create(
          exitActivity(
            sampleEmp.id,
            "",
            actor,
            "Exit confirmation data repaired",
            `repaired=${repairedItems} createdTasks=${createdTasks} warnings=${warnings}`
          )
        );
      }
    }
  }

  if (options?.persist !== false) {
    uow.persist();
  }

  return { repairedItems, createdTasks, warnings };
}

export function resolveDisplayName(emailOrName: string): string {
  const email = migrateEmailAddress(emailOrName);
  return (
    profileByEmail(email)?.name ||
    findDemoUserByEmail(email)?.name ||
    emailOrName
  );
}
