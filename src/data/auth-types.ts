/** Auth & automation domain models for the local prototype. */

export type UserRole =
  | "Admin"
  | "HR"
  | "IT_SECURITY"
  | "ONSITE_IT"
  | "FACILITIES"
  | "HIRING_MANAGER"
  | "FINANCE"
  | "CORPORATE_CARD"
  | "ADMINISTRATION"
  | "QUALITY"
  | "PRODUCT_STEWARDSHIP"
  | "OFFBOARDING_EMPLOYEE"
  | "ONBOARDING_EMPLOYEE";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Prototype only — never a real credential store. */
  password: string;
  role: UserRole;
  responsibleTeam?: string;
  initials?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  loggedInAt: string;
}

export type AutomationRunStatus = "Running" | "Successful" | "Failed";

export interface AutomationStep {
  id: string;
  order: number;
  name: string;
  status: "Pending" | "Running" | "Successful" | "Failed";
  detail: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AutomationRun {
  id: string;
  runNumber: string;
  trigger: string;
  employeeId: string;
  onboardingCaseId: string;
  status: AutomationRunStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  tasksAssigned: number;
  emailsGenerated: number;
  errorMessage: string | null;
  steps: AutomationStep[];
  simulateFailure: boolean;
}

export type MockEmailStatus = "Unread" | "Read" | "Deleted";

export interface MockEmail {
  id: string;
  automationRunId: string;
  from: string;
  to: string;
  cc: string[];
  subject: string;
  htmlBody: string;
  sentAt: string;
  readAt: string | null;
  status: MockEmailStatus;
  employeeId: string;
  onboardingCaseId: string;
  responsibleTeam: string;
  attachments?: import("./exit-clearance-types").MockEmailAttachment[];
  /** Optional notification metadata for idempotent ensure / dedupe */
  sourceType?: string | null;
  sourceRecordId?: string | null;
  relatedTaskId?: string | null;
  relatedFormType?: string | null;
  relatedFormId?: string | null;
  notificationType?: string | null;
}
