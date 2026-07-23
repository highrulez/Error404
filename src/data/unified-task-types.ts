/** Unified Task Center enums — extend ChecklistTask without replacing it. */

export type UnifiedTaskType =
  | "Action"
  | "Approval"
  | "Confirmation"
  | "Review"
  | "Information";

export type UnifiedTaskOutcome =
  | "None"
  | "Completed"
  | "Approved"
  | "Rejected"
  | "Confirmed"
  | "Returned for Correction"
  | "Reviewed"
  | "Acknowledged"
  | "Decision Recorded"
  | "Not Required"
  | "Cancelled";

export type UnifiedSourceType =
  | "Checklist"
  | "Exit Clearance Form"
  | "Induction Checklist"
  | "Induction Checklist Section"
  | "Access Card Application"
  | "Workflow"
  | "Manual";

export const UNIFIED_TASK_TYPES: UnifiedTaskType[] = [
  "Action",
  "Approval",
  "Confirmation",
  "Review",
  "Information",
];

export const UNIFIED_TASK_OUTCOMES: UnifiedTaskOutcome[] = [
  "None",
  "Completed",
  "Approved",
  "Rejected",
  "Confirmed",
  "Returned for Correction",
  "Reviewed",
  "Acknowledged",
  "Decision Recorded",
  "Not Required",
  "Cancelled",
];
