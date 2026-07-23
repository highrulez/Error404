/** Employee-safe offboarding case DTO — never include internal department tasks. */

export type EmployeeFacingClearanceStatus =
  | "Form Pending"
  | "Form Submitted"
  | "Awaiting Department Review"
  | "Return Scheduled"
  | "Clearance In Progress"
  | "Cleared";

export interface EmployeeSafeFormSummary {
  id: string;
  formName: string;
  formKind: "Exit Clearance" | "Induction Checklist" | "Access Card Application";
  status: string;
  sentAt: string | null;
  dueDate: string | null;
  updatedAt: string;
  href: string;
  reviewer?: string | null;
  reviewStatus?: string;
}

export interface EmployeeSafeTaskSummary {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  taskType: string;
  href: string;
  relatedForm?: string;
}

export interface EmployeeSafeActivity {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
}

export interface EmployeeSafeOffboardingCase {
  caseId: string;
  caseNumber: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  employeeEmail: string;
  lastWorkingDate: string | null;
  status: string;
  employeeActionProgress: number;
  clearanceStatus: EmployeeFacingClearanceStatus;
  assetReturnStatus: string;
  forms: EmployeeSafeFormSummary[];
  myTasks: EmployeeSafeTaskSummary[];
  activity: EmployeeSafeActivity[];
  contacts: { label: string; email: string }[];
}
