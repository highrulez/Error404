import type { ChecklistTask } from "./types";
import type { UnifiedTaskType, UnifiedTaskOutcome } from "./unified-task-types";
import { findDemoUserByEmail } from "./auth-accounts";

/** Infer and backfill Unified Task Center fields on existing tasks. */
export function normalizeUnifiedTask(task: ChecklistTask): ChecklistTask {
  const taskType: UnifiedTaskType =
    task.taskType ??
    (task.isExitClearanceConfirmation
      ? "Confirmation"
      : task.isExitClearanceEmployeeTask
        ? "Action"
        : "Action");

  const outcome: UnifiedTaskOutcome =
    task.outcome ??
    (task.status === "Completed"
      ? taskType === "Confirmation"
        ? "Confirmed"
        : "Completed"
      : "None");

  const linkedExitClearanceFormId =
    task.linkedExitClearanceFormId ?? task.exitFormId ?? null;
  const linkedChecklistItemId =
    task.linkedChecklistItemId ?? task.exitFormItemId ?? null;

  const assignee = task.assignedEmail
    ? findDemoUserByEmail(task.assignedEmail)
    : undefined;

  return {
    ...task,
    taskType,
    outcome,
    instructions: task.instructions ?? task.description ?? "",
    lifecycleCaseId:
      task.lifecycleCaseId ??
      task.offboardingCaseId ??
      task.onboardingCaseId ??
      null,
    employeeName: task.employeeName,
    employeeEmail: task.employeeEmail,
    department: task.department,
    responsibleRole: task.responsibleRole ?? task.assignedOwner,
    assignedUserId: task.assignedUserId ?? assignee?.id ?? null,
    assignedUserName:
      task.assignedUserName ?? assignee?.name ?? task.assignedPersonName,
    assignedTeam: task.assignedTeam ?? task.responsibleTeam,
    startedAt: task.startedAt ?? null,
    completedBy: task.completedBy ?? null,
    completedByName: task.completedByName ?? null,
    remarks: task.remarks ?? task.notes ?? "",
    blocked: task.blocked ?? task.status === "Blocked",
    sourceType:
      task.sourceType ??
      (task.isExitClearanceConfirmation || task.isExitClearanceEmployeeTask
        ? "Exit Clearance Form"
        : "Checklist"),
    sourceRecordId:
      task.sourceRecordId ?? linkedChecklistItemId ?? task.templateTaskId ?? null,
    linkedExitClearanceFormId,
    linkedChecklistItemId,
    exitFormId: task.exitFormId ?? linkedExitClearanceFormId,
    exitFormItemId: task.exitFormItemId ?? linkedChecklistItemId,
    isExitClearanceConfirmation:
      task.isExitClearanceConfirmation ?? taskType === "Confirmation",
    isExitClearanceEmployeeTask: task.isExitClearanceEmployeeTask ?? false,
  };
}
