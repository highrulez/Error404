import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import type { ChecklistTask, TaskStatus } from "./types";
import type {
  UnifiedTaskOutcome,
  UnifiedTaskType,
} from "./unified-task-types";
import type { EmployeeExitClearanceForm } from "./exit-clearance-types";
import { canUpdateTask, canViewTask } from "./auth-session";
import {
  allRequiredConfirmationsDone,
  calculateExitFormProgress,
  exitActivity,
  buildConfirmationTasks,
  buildCompletedExitFormEmail,
  recordExitAutomationRun,
} from "./exit-clearance-engine";
import { refreshOffboardingCaseProgress } from "./offboarding-engine";
import {
  stopAllReminders,
  stopNotStartedReminders,
} from "./automation/reminder-engine";
import {
  isTaskBlockedByDependencies,
  unmetPrerequisiteTitles,
  applyDependencyGraph,
} from "./dependencies";
import { normalizeUnifiedTask } from "./task-normalize";
import { profileByEmail, initialsFromName } from "./demo-profiles";
import { findDemoUserByEmail } from "./auth-accounts";
import { migrateEmailAddress } from "./email-domain";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export type TaskWorkflowAction =
  | "Start"
  | "Complete"
  | "Approve"
  | "Reject"
  | "Confirm"
  | "Return for Correction"
  | "Start Review"
  | "Complete Review"
  | "Acknowledge"
  | "Admin Override Confirmation";

export interface ExecuteTaskInput {
  taskId: string;
  actingUserId: string;
  session: UserSession;
  action: TaskWorkflowAction;
  remarks?: string;
  initials?: string;
  outcome?: UnifiedTaskOutcome;
  overrideReason?: string;
}

export type WorkflowResult =
  | { ok: true; task: ChecklistTask; notice?: string }
  | { ok: false; error: string };

function caseTasksFor(uow: UnitOfWork, task: ChecklistTask): ChecklistTask[] {
  if (task.offboardingCaseId) {
    return uow.tasks
      .list()
      .filter((t) => t.offboardingCaseId === task.offboardingCaseId);
  }
  return uow.tasks.listByCaseId(task.onboardingCaseId);
}

function writeAudit(
  uow: UnitOfWork,
  args: {
    session: UserSession;
    task: ChecklistTask;
    action: string;
    before: unknown;
    after: unknown;
    remarks?: string;
  }
) {
  const before = JSON.stringify(args.before).slice(0, 1800);
  const after = JSON.stringify(args.after).slice(0, 1800);
  uow.activity.create({
    id: uid("act-audit"),
    employeeId: args.task.employeeId,
    onboardingCaseId: args.task.onboardingCaseId || "",
    offboardingCaseId: args.task.offboardingCaseId ?? null,
    timestamp: nowIso(),
    actor: args.session.name,
    action: `Audit: ${args.action}`,
    detail: [
      `taskId=${args.task.id}`,
      `taskType=${args.task.taskType ?? "Action"}`,
      `lifecycleCaseId=${args.task.lifecycleCaseId ?? args.task.offboardingCaseId ?? args.task.onboardingCaseId}`,
      `source=${args.task.sourceType ?? ""}:${args.task.sourceRecordId ?? ""}`,
      `actor=${args.session.email}`,
      args.remarks ? `remarks=${args.remarks}` : "",
      `before=${before}`,
      `after=${after}`,
    ]
      .filter(Boolean)
      .join(" · "),
  });
}

function finalizeExitClearance(
  uow: UnitOfWork,
  form: EmployeeExitClearanceForm
): EmployeeExitClearanceForm {
  const ts = nowIso();
  let completed: EmployeeExitClearanceForm = {
    ...form,
    formStatus: "Fully Cleared",
    completedAt: ts,
    updatedAt: ts,
  };
  uow.exitClearanceForms.update(completed);
  uow.activity.create(
    exitActivity(
      form.employeeId,
      form.offboardingCaseId,
      "OneFlow Automation",
      "Exit clearance fully cleared",
      `Progress 100% · ${calculateExitFormProgress(completed).clearedCount}/${completed.checklistItems.length} cleared`
    )
  );
  const employee = uow.employees.getById(form.employeeId);
  if (employee) {
    const runId = recordExitAutomationRun({
      uow,
      employee,
      caseId: form.offboardingCaseId,
      trigger: "Exit clearance fully cleared",
      taskCount: 0,
      emailCount: 1,
    });
    const email = buildCompletedExitFormEmail({ form: completed, runId });
    completed = {
      ...completed,
      completedEmailId: email.id,
      formStatus: "Completed",
      updatedAt: nowIso(),
    };
    uow.exitClearanceForms.update(completed);
    uow.mockEmails.createMany([email]);
  } else {
    completed = {
      ...completed,
      formStatus: "Completed",
      updatedAt: nowIso(),
    };
    uow.exitClearanceForms.update(completed);
  }
  return completed;
}

export class TaskWorkflowService {
  constructor(private uow: UnitOfWork) {}

  validateTaskAuthorization(
    session: UserSession,
    task: ChecklistTask,
    options?: { forConfirmation?: boolean; adminOverride?: boolean }
  ): string | null {
    if (session.role === "OFFBOARDING_EMPLOYEE" && options?.forConfirmation) {
      return "Offboarding employees may not confirm department tasks.";
    }
    if (options?.adminOverride) {
      if (session.role !== "Admin") return "Admin only.";
      return null;
    }
    const employee = this.uow.employees.getById(task.employeeId);
    const caseTasks = caseTasksFor(this.uow, task);

    if (options?.forConfirmation) {
      if (session.role === "Admin") return null;
      const emailOk =
        migrateEmailAddress(session.email).toLowerCase() ===
        migrateEmailAddress(task.assignedEmail).toLowerCase();
      if (!emailOk) {
        return "You are not authorized for this confirmation task.";
      }
      void employee;
      void caseTasks;
      return null;
    }

    if (!canViewTask(session, task, employee)) {
      return "You are not authorized to view this task.";
    }
    if (!canUpdateTask(session, task, employee, caseTasks)) {
      return "You are not authorized to update this task.";
    }
    return null;
  }

  validateTaskDependencies(task: ChecklistTask): string | null {
    const caseTasks = caseTasksFor(this.uow, task);
    if (task.status === "Blocked" || isTaskBlockedByDependencies(task, caseTasks)) {
      const unmet = unmetPrerequisiteTitles(task, caseTasks);
      return unmet.length
        ? `Task is blocked until completed: ${unmet.join(", ")}.`
        : "Task is blocked by unmet prerequisites.";
    }
    return null;
  }

  stopTaskReminders(task: ChecklistTask): ChecklistTask {
    return stopAllReminders(task);
  }

  unlockDependentTasks(task: ChecklistTask, actor: string) {
    const caseId = task.offboardingCaseId || task.onboardingCaseId;
    if (!caseId) return;
    const working = caseTasksFor(this.uow, task);
    const graphed = applyDependencyGraph(working);
    for (const t of graphed) {
      const prev = working.find((x) => x.id === t.id);
      if (!prev) continue;
      if (prev.status === "Blocked" && t.status === "Pending") {
        const unlocked = {
          ...restartIfNeeded(prev),
          status: "Pending" as const,
          blockedReason: null,
          blocked: false,
          unlockedAt: nowIso(),
        };
        this.uow.tasks.update(unlocked);
        this.uow.activity.create({
          id: uid("act"),
          employeeId: unlocked.employeeId,
          onboardingCaseId: unlocked.onboardingCaseId || "",
          offboardingCaseId: unlocked.offboardingCaseId ?? null,
          timestamp: nowIso(),
          actor,
          action: "Dependent task unlocked",
          detail: `${unlocked.title} unlocked after ${task.title} completed.`,
        });
      } else if (prev.status !== t.status || prev.blockedReason !== t.blockedReason) {
        this.uow.tasks.update(t);
      }
    }
  }

  recalculateLifecycleProgress(task: ChecklistTask) {
    if (task.offboardingCaseId) {
      refreshOffboardingCaseProgress(this.uow, task.offboardingCaseId);
    }
  }

  startTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    if (normalized.taskType === "Confirmation") {
      return {
        ok: false,
        error: "Confirmation tasks cannot use Start. Use Confirm or Return for Correction.",
      };
    }
    const auth = this.validateTaskAuthorization(input.session, normalized);
    if (auth) return { ok: false, error: auth };
    const deps = this.validateTaskDependencies(normalized);
    if (deps) return { ok: false, error: deps };
    if (normalized.status === "Completed" || normalized.status === "Cancelled") {
      return { ok: false, error: "Task is already closed." };
    }
    if (normalized.status === "In Progress") {
      return { ok: true, task: normalized };
    }

    const snap = this.uow.snapshot();
    try {
      const next: ChecklistTask = {
        ...stopNotStartedReminders(normalized),
        status: "In Progress",
        startedAt: nowIso(),
        blocked: false,
        blockedReason: null,
      };
      this.uow.tasks.update(next);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: next.onboardingCaseId || "",
        offboardingCaseId: next.offboardingCaseId ?? null,
        timestamp: nowIso(),
        actor: input.session.name,
        action: "Task started",
        detail: `${input.session.name} started ${next.title}.`,
      });
      writeAudit(this.uow, {
        session: input.session,
        task: next,
        action: "startTask",
        before: { status: task.status },
        after: { status: next.status, startedAt: next.startedAt },
      });
      this.uow.persist();
      return { ok: true, task: next };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to start task.",
      };
    }
  }

  executeActionTask(input: ExecuteTaskInput): WorkflowResult {
    if (input.action === "Start") return this.startTask(input);
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    if (normalized.taskType === "Confirmation") {
      return {
        ok: false,
        error: "Confirmation tasks cannot be completed with the generic Action workflow.",
      };
    }
    const auth = this.validateTaskAuthorization(input.session, normalized);
    if (auth) return { ok: false, error: auth };
    const deps = this.validateTaskDependencies(normalized);
    if (deps) return { ok: false, error: deps };
    if (normalized.status === "Completed") {
      return { ok: false, error: "Task is already completed." };
    }

    const snap = this.uow.snapshot();
    try {
      const ts = nowIso();
      const next: ChecklistTask = {
        ...this.stopTaskReminders(normalized),
        status: "Completed",
        outcome: "Completed",
        completedAt: ts,
        completedBy: input.session.email,
        completedByName: input.session.name,
        remarks: input.remarks ?? normalized.remarks ?? "",
        notes: input.remarks ?? normalized.notes,
      };
      this.uow.tasks.update(next);
      this.unlockDependentTasks(next, input.session.name);
      this.recalculateLifecycleProgress(next);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: next.onboardingCaseId || "",
        offboardingCaseId: next.offboardingCaseId ?? null,
        timestamp: ts,
        actor: input.session.name,
        action: "Task completed",
        detail: `${input.session.name} completed ${next.title}.`,
      });
      writeAudit(this.uow, {
        session: input.session,
        task: next,
        action: "executeActionTask",
        before: { status: task.status, outcome: task.outcome },
        after: { status: next.status, outcome: next.outcome },
        remarks: input.remarks,
      });
      this.uow.persist();
      return { ok: true, task: next };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to complete task.",
      };
    }
  }

  executeApprovalTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    if (normalized.taskType !== "Approval") {
      return { ok: false, error: "Not an Approval task." };
    }
    const auth = this.validateTaskAuthorization(input.session, normalized);
    if (auth) return { ok: false, error: auth };
    if (normalized.status === "Completed") {
      return { ok: false, error: "Task is already completed." };
    }
    if (input.action === "Reject" && !input.remarks?.trim()) {
      return { ok: false, error: "Rejection reason is required." };
    }

    const snap = this.uow.snapshot();
    try {
      const ts = nowIso();
      const approved = input.action === "Approve";
      const next: ChecklistTask = {
        ...this.stopTaskReminders(normalized),
        status: "Completed",
        outcome: approved ? "Approved" : "Rejected",
        completedAt: ts,
        completedBy: input.session.email,
        completedByName: input.session.name,
        remarks: input.remarks ?? "",
        notes: input.remarks ?? "",
      };
      this.uow.tasks.update(next);
      this.unlockDependentTasks(next, input.session.name);
      this.recalculateLifecycleProgress(next);

      if (!approved) {
        const employee = this.uow.employees.getById(next.employeeId);
        if (employee) {
          this.uow.mockEmails.createMany([
            {
              id: uid("mail-reject"),
              automationRunId: "",
              from: "oneflow@ppg-demo.com",
              to: employee.email,
              cc: ["hr@ppg-demo.com"],
              subject: `Request rejected: ${next.title}`,
              htmlBody: `<p>Hello ${employee.fullName},</p><p>Your request <strong>${next.title}</strong> was rejected.</p><p>Reason: ${input.remarks}</p>`,
              sentAt: ts,
              readAt: null,
              status: "Unread",
              employeeId: employee.id,
              onboardingCaseId: next.onboardingCaseId || next.offboardingCaseId || "",
              responsibleTeam: next.responsibleTeam,
            },
          ]);
        }
      }

      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: next.onboardingCaseId || "",
        offboardingCaseId: next.offboardingCaseId ?? null,
        timestamp: ts,
        actor: input.session.name,
        action: approved ? "Approval granted" : "Approval rejected",
        detail: `${input.session.name} ${approved ? "approved" : "rejected"} ${next.title}.`,
      });
      writeAudit(this.uow, {
        session: input.session,
        task: next,
        action: "executeApprovalTask",
        before: { status: task.status },
        after: { status: next.status, outcome: next.outcome },
        remarks: input.remarks,
      });
      this.uow.persist();
      return { ok: true, task: next };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Approval action failed.",
      };
    }
  }

  executeConfirmationTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    let normalized = normalizeUnifiedTask(task);
    if (normalized.taskType !== "Confirmation" && !normalized.isExitClearanceConfirmation) {
      return { ok: false, error: "Not a Confirmation task." };
    }

    const isOverride = input.action === "Admin Override Confirmation";
    if (isOverride) {
      if (input.session.role !== "Admin") {
        return { ok: false, error: "Admin only." };
      }
      if (!input.overrideReason?.trim()) {
        return { ok: false, error: "Override reason is required." };
      }
      if (!input.outcome || !["Confirmed", "Returned for Correction"].includes(input.outcome)) {
        return { ok: false, error: "Select Confirmed or Returned for Correction." };
      }
    }

    const auth = this.validateTaskAuthorization(input.session, normalized, {
      forConfirmation: true,
      adminOverride: isOverride,
    });
    if (auth) return { ok: false, error: auth };

    if (normalized.status === "Completed" && !isOverride) {
      return { ok: false, error: "Confirmation task is already completed." };
    }

    const action =
      isOverride && input.outcome === "Returned for Correction"
        ? "Return for Correction"
        : isOverride
          ? "Confirm"
          : input.action === "Confirm" || input.action === "Return for Correction"
            ? input.action
            : null;

    if (!action) {
      return { ok: false, error: "Use Confirm or Return for Correction." };
    }
    if (action === "Return for Correction" && !input.remarks?.trim()) {
      return { ok: false, error: "Correction reason is required." };
    }

    const formId =
      normalized.linkedExitClearanceFormId || normalized.exitFormId;
    const itemId =
      normalized.linkedChecklistItemId || normalized.exitFormItemId;
    if (!formId || !itemId) {
      return {
        ok: false,
        error:
          "Confirmation task is missing Exit Clearance link IDs. Contact Admin — title-based matching is not allowed.",
      };
    }

    const form = this.uow.exitClearanceForms.getById(formId);
    if (!form) return { ok: false, error: "Exit Clearance Form not found." };
    const item = form.checklistItems.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: "Checklist item not found." };

    const snap = this.uow.snapshot();
    try {
      const ts = nowIso();
      const profile = profileByEmail(input.session.email);
      const initials =
        input.initials?.trim() ||
        profile?.initials ||
        initialsFromName(input.session.name);
      const remarks = input.remarks?.trim() || "";
      const displayName = input.session.name;

      const confirmed = action === "Confirm";
      const nextItems = form.checklistItems.map((i) => {
        if (i.id !== item.id) return i;
        return {
          ...i,
          confirmationStatus: confirmed
            ? ("Confirmed" as const)
            : ("Returned for Correction" as const),
          confirmationName: displayName,
          confirmationInitial: initials,
          confirmationDate: ts.slice(0, 10),
          confirmationRemarks: remarks,
          unlockedForCorrection: !confirmed,
          linkedTaskId: normalized.id,
        };
      });

      let formStatus = form.formStatus;
      if (!confirmed) {
        formStatus = "Returned for Correction";
      } else if (
        formStatus === "Submitted" ||
        formStatus === "Returned for Correction"
      ) {
        formStatus = "Confirmation In Progress";
      }

      let nextForm: EmployeeExitClearanceForm = {
        ...form,
        checklistItems: nextItems,
        formStatus,
        reviewedAt: form.reviewedAt || ts,
        updatedAt: ts,
      };

      const originalAssignee = {
        email: normalized.assignedEmail,
        name: normalized.assignedUserName || normalized.assignedPersonName,
      };

      const nextTask: ChecklistTask = {
        ...this.stopTaskReminders(normalized),
        status: "Completed",
        outcome: confirmed ? "Confirmed" : "Returned for Correction",
        completedAt: ts,
        completedBy: input.session.email,
        completedByName: displayName,
        remarks,
        notes: remarks,
        linkedExitClearanceFormId: formId,
        linkedChecklistItemId: itemId,
        exitFormId: formId,
        exitFormItemId: itemId,
        sourceType: "Exit Clearance Form",
        sourceRecordId: itemId,
        taskType: "Confirmation",
        isExitClearanceConfirmation: true,
      };

      this.uow.tasks.update(nextTask);
      this.uow.exitClearanceForms.update(nextForm);

      if (!confirmed) {
        this.uow.mockEmails.createMany([
          {
            id: uid("mail-exit-corr"),
            automationRunId: "",
            from: "oneflow.offboarding@ppg-demo.com",
            to: form.employeeEmail,
            cc: ["hr@ppg-demo.com"],
            subject: "Action Required: Exit Clearance Form returned for correction",
            htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;"><p>Hello ${form.employeeName},</p><p>Item <strong>${item.title}</strong> was returned for correction.</p><p>Reason: ${remarks || "Please review and update."}</p><p><a href="/oneflow/exit-clearance/${form.id}">Open Exit Clearance Form</a></p></div>`,
            sentAt: ts,
            readAt: null,
            status: "Unread",
            employeeId: form.employeeId,
            onboardingCaseId: form.offboardingCaseId,
            responsibleTeam: "HR Operations",
          },
        ]);
        const empTask = this.uow.tasks
          .list()
          .find((t) => t.exitFormId === form.id && t.isExitClearanceEmployeeTask);
        if (empTask) {
          this.uow.tasks.update({
            ...empTask,
            status: "In Progress",
            completedAt: null,
            outcome: "None",
          });
        }
      } else if (allRequiredConfirmationsDone(nextForm)) {
        nextForm = finalizeExitClearance(this.uow, nextForm);
      }

      const progress = calculateExitFormProgress(
        this.uow.exitClearanceForms.getById(form.id)!
      );
      this.uow.activity.create(
        exitActivity(
          form.employeeId,
          form.offboardingCaseId,
          input.session.name,
          confirmed
            ? `${displayName} confirmed ${item.title}`
            : `${displayName} returned ${item.title} for correction`,
          confirmed
            ? `Confirmed · Initial ${initials}${remarks ? ` · ${remarks}` : ""}`
            : `Returned for Correction · ${remarks}`
        )
      );
      this.uow.activity.create(
        exitActivity(
          form.employeeId,
          form.offboardingCaseId,
          "OneFlow Automation",
          "Exit Clearance progress updated",
          `Exit Clearance progress updated to ${progress.percent}% (${progress.clearedCount}/${nextForm.checklistItems.length} cleared). Confirmation reminder stopped after task completion.`
        )
      );

      if (isOverride) {
        writeAudit(this.uow, {
          session: input.session,
          task: nextTask,
          action: "Admin Override Confirmation",
          before: {
            assignedTo: originalAssignee,
            itemStatus: item.confirmationStatus,
            taskStatus: task.status,
          },
          after: {
            outcome: nextTask.outcome,
            itemStatus: confirmed ? "Confirmed" : "Returned for Correction",
            overrideReason: input.overrideReason,
          },
          remarks: `${input.overrideReason} · ${remarks}`,
        });
      } else {
        writeAudit(this.uow, {
          session: input.session,
          task: nextTask,
          action: "executeConfirmationTask",
          before: {
            taskStatus: task.status,
            confirmationStatus: item.confirmationStatus,
          },
          after: {
            taskStatus: nextTask.status,
            outcome: nextTask.outcome,
            confirmationStatus: confirmed ? "Confirmed" : "Returned for Correction",
            confirmationName: displayName,
            confirmationInitial: initials,
          },
          remarks,
        });
      }

      this.unlockDependentTasks(nextTask, input.session.name);
      refreshOffboardingCaseProgress(this.uow, form.offboardingCaseId);
      this.uow.persist();

      const refreshed = this.uow.tasks.getById(nextTask.id)!;
      return { ok: true, task: refreshed };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "Confirmation update failed. Changes were rolled back.",
      };
    }
  }

  /**
   * Reopen or create confirmation task after employee corrects and resubmits an item.
   */
  reopenConfirmationAfterResubmit(
    form: EmployeeExitClearanceForm,
    itemId: string,
    session: UserSession
  ): void {
    const item = form.checklistItems.find((i) => i.id === itemId);
    if (!item) return;
    if (item.confirmationStatus === "Not Required") return;

    const existing = item.linkedTaskId
      ? this.uow.tasks.getById(item.linkedTaskId)
      : this.uow.tasks
          .list()
          .find(
            (t) =>
              t.linkedChecklistItemId === item.id || t.exitFormItemId === item.id
          );

    if (existing) {
      if (existing.status === "Completed") {
        const reopened: ChecklistTask = {
          ...normalizeUnifiedTask(existing),
          status: "Pending",
          outcome: "None",
          completedAt: null,
          completedBy: null,
          completedByName: null,
          remarks: "",
          notes: `Previous confirmation history retained. Resubmitted ${nowIso()}.`,
          reminderStatus: "Scheduled",
          nextReminderDueAt: nowIso(),
        };
        // Re-init reminders lightly
        const withReminders = {
          ...reopened,
          reminderEnabled: true,
          reminderCount: 0,
          lastReminderSentAt: null,
        };
        this.uow.tasks.update(withReminders);
      }
      return;
    }

    const employee = this.uow.employees.getById(form.employeeId);
    if (!employee) return;
    const { tasks, updatedItems } = buildConfirmationTasks({ form, employee });
    if (tasks.length) {
      this.uow.tasks.createMany(tasks);
      this.uow.exitClearanceForms.update({
        ...form,
        checklistItems: updatedItems,
      });
      this.uow.activity.create(
        exitActivity(
          form.employeeId,
          form.offboardingCaseId,
          session.name,
          "Confirmation task reopened",
          `New confirmation task(s) after correction resubmit`
        )
      );
    }
  }

  executeReviewTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    if (normalized.taskType !== "Review") {
      // Treat generic review-like as Action if mis-tagged
      if (input.action === "Start Review") {
        return this.startTask({ ...input, action: "Start" });
      }
      return this.executeActionTask({ ...input, action: "Complete" });
    }
    if (input.action === "Start Review") {
      return this.startTask({ ...input, action: "Start" });
    }
    if (input.action === "Return for Correction") {
      const auth = this.validateTaskAuthorization(input.session, normalized);
      if (auth) return { ok: false, error: auth };
      if (!input.remarks?.trim()) {
        return { ok: false, error: "Correction reason is required." };
      }
      const snap = this.uow.snapshot();
      try {
        const next: ChecklistTask = {
          ...this.stopTaskReminders(normalized),
          status: "Completed",
          outcome: "Returned for Correction",
          completedAt: nowIso(),
          completedBy: input.session.email,
          completedByName: input.session.name,
          remarks: input.remarks,
          notes: input.remarks,
        };
        this.uow.tasks.update(next);
        writeAudit(this.uow, {
          session: input.session,
          task: next,
          action: "executeReviewTask:return",
          before: { status: task.status },
          after: { outcome: next.outcome },
          remarks: input.remarks,
        });
        this.uow.persist();
        return { ok: true, task: next };
      } catch (e) {
        this.uow.reset(snap);
        this.uow.persist();
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Review return failed.",
        };
      }
    }

    const auth = this.validateTaskAuthorization(input.session, normalized);
    if (auth) return { ok: false, error: auth };
    const deps = this.validateTaskDependencies(normalized);
    if (deps) return { ok: false, error: deps };

    const snap = this.uow.snapshot();
    try {
      const next: ChecklistTask = {
        ...this.stopTaskReminders(normalized),
        status: "Completed",
        outcome: "Reviewed",
        completedAt: nowIso(),
        completedBy: input.session.email,
        completedByName: input.session.name,
        remarks: input.remarks ?? "",
        notes: input.remarks ?? "",
      };
      this.uow.tasks.update(next);
      this.unlockDependentTasks(next, input.session.name);
      this.recalculateLifecycleProgress(next);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: next.onboardingCaseId || "",
        offboardingCaseId: next.offboardingCaseId ?? null,
        timestamp: nowIso(),
        actor: input.session.name,
        action: "Review completed",
        detail: `${input.session.name} reviewed ${next.title}.`,
      });
      writeAudit(this.uow, {
        session: input.session,
        task: next,
        action: "executeReviewTask",
        before: { status: task.status },
        after: { status: next.status, outcome: next.outcome },
        remarks: input.remarks,
      });
      this.uow.persist();
      return { ok: true, task: next };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Review failed.",
      };
    }
  }

  acknowledgeInformationTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    if (normalized.taskType !== "Information") {
      return { ok: false, error: "Not an Information task." };
    }
    const auth = this.validateTaskAuthorization(input.session, normalized);
    if (auth) return { ok: false, error: auth };

    const snap = this.uow.snapshot();
    try {
      const next: ChecklistTask = {
        ...this.stopTaskReminders(normalized),
        status: "Completed",
        outcome: "Acknowledged",
        completedAt: nowIso(),
        completedBy: input.session.email,
        completedByName: input.session.name,
        remarks: input.remarks ?? "",
      };
      this.uow.tasks.update(next);
      this.recalculateLifecycleProgress(next);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: next.onboardingCaseId || "",
        offboardingCaseId: next.offboardingCaseId ?? null,
        timestamp: nowIso(),
        actor: input.session.name,
        action: "Information acknowledged",
        detail: `${input.session.name} acknowledged ${next.title}.`,
      });
      writeAudit(this.uow, {
        session: input.session,
        task: next,
        action: "acknowledgeInformationTask",
        before: { status: task.status },
        after: { status: next.status, outcome: next.outcome },
      });
      this.uow.persist();
      return { ok: true, task: next };
    } catch (e) {
      this.uow.reset(snap);
      this.uow.persist();
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Acknowledge failed.",
      };
    }
  }

  /** Main dispatcher — routes by taskType. */
  executeTask(input: ExecuteTaskInput): WorkflowResult {
    const task = this.uow.tasks.getById(input.taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    const type: UnifiedTaskType = normalized.taskType ?? "Action";

    // Never allow Confirmation through generic Complete
    if (
      type === "Confirmation" ||
      normalized.isExitClearanceConfirmation
    ) {
      if (
        input.action === "Complete" ||
        input.action === "Start" ||
        input.action === "Approve" ||
        input.action === "Reject" ||
        input.action === "Acknowledge"
      ) {
        return {
          ok: false,
          error:
            "Confirmation tasks must use Confirm or Return for Correction (or Admin Override).",
        };
      }
      return this.executeConfirmationTask(input);
    }

    switch (type) {
      case "Approval":
        if (input.action === "Start") return this.startTask(input);
        return this.executeApprovalTask(input);
      case "Review":
        return this.executeReviewTask(input);
      case "Information":
        return this.acknowledgeInformationTask(input);
      case "Action":
      default:
        if (input.action === "Start") return this.startTask(input);
        if (input.action === "Complete") return this.executeActionTask(input);
        return {
          ok: false,
          error: `Action "${input.action}" is not valid for ${type} tasks.`,
        };
    }
  }

  /** Authorization gate for viewing task detail by URL. */
  assertCanAccessTask(
    session: UserSession,
    taskId: string
  ): WorkflowResult {
    const task = this.uow.tasks.getById(taskId);
    if (!task) return { ok: false, error: "Task not found." };
    const normalized = normalizeUnifiedTask(task);
    const employee = this.uow.employees.getById(normalized.employeeId);
    if (!canViewTask(session, normalized, employee)) {
      return { ok: false, error: "Access denied. You are not authorized for this task." };
    }
    return { ok: true, task: normalized };
  }
}

function restartIfNeeded(task: ChecklistTask): ChecklistTask {
  if (task.reminderStatus === "Stopped" || task.reminderEnabled === false) {
    return {
      ...task,
      reminderStatus: "Scheduled",
      reminderEnabled: true,
      nextReminderDueAt: nowIso(),
    };
  }
  return task;
}

/** Map legacy TaskStatus updates away from Confirmation tasks. */
export function isConfirmationTask(task: ChecklistTask): boolean {
  const n = normalizeUnifiedTask(task);
  return n.taskType === "Confirmation" || Boolean(n.isExitClearanceConfirmation);
}

export type { TaskStatus };
