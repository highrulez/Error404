/** Offboarding-specific domain helpers and constants. */

export type TerminationType =
  | "Resignation"
  | "Retirement"
  | "Contract End"
  | "Internal Transfer"
  | "Involuntary Termination";

export type OffboardingCaseStatus =
  | "Scheduled"
  | "In Progress"
  | "Awaiting Last Day"
  | "Access Removal In Progress"
  | "Clearance Pending"
  | "Completed"
  | "Cancelled";

export type OffboardingRiskLevel =
  | "Normal"
  | "Attention Required"
  | "Security Risk"
  | "Critical";

export type ExecutionMode = "Scheduled" | "Immediate" | "Manual Confirmation";

export type ExecutionStatus =
  | "Not Scheduled"
  | "Scheduled"
  | "Ready"
  | "Completed"
  | "Overdue"
  | "Cancelled";

export const TERMINATION_TYPES: TerminationType[] = [
  "Resignation",
  "Retirement",
  "Contract End",
  "Internal Transfer",
  "Involuntary Termination",
];

export const OFFBOARDING_CASE_STATUSES: OffboardingCaseStatus[] = [
  "Scheduled",
  "In Progress",
  "Awaiting Last Day",
  "Access Removal In Progress",
  "Clearance Pending",
  "Completed",
  "Cancelled",
];

export interface OffboardingCase {
  id: string;
  caseNumber: string;
  employeeId: string;
  status: OffboardingCaseStatus;
  overallProgress: number;
  riskLevel: OffboardingRiskLevel;
  lastWorkingDate: string;
  terminationType: TerminationType;
  terminationReason: string;
  immediateAccessRemovalRequired: boolean;
  createdAt: string;
  updatedAt: string;
  lastWorkflowTriggeredAt?: string | null;
  lastWorkflowError?: string | null;
  completedAt?: string | null;
}

export type LifecycleProcess = "Onboarding" | "Offboarding";
