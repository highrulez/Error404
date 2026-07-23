/** Employee Exit Clearance Form domain — mirrors the paper form. */

export type ExitClearanceFormStatus =
  | "Not Sent"
  | "Sent"
  | "Opened"
  | "Draft"
  | "Submitted"
  | "Confirmation In Progress"
  | "Returned for Correction"
  | "Fully Cleared"
  | "Completed";

export type ExitEmployeeAnswer = "Yes" | "No" | "Not Selected";

export type ExitConfirmationStatus =
  | "Not Required"
  | "Pending"
  | "In Progress"
  | "Confirmed"
  | "Rejected"
  | "Returned for Correction";

export type ExitConfirmationDepartment =
  | "Human Resources"
  | "Direct Line Manager"
  | "Finance / Concur Team"
  | "APAC Corporate Card Admin"
  | "Administration";

export type ExitAssignmentEmailRule =
  | "Fixed Email"
  | "Employee Manager Email";

export type ExitConditionalFieldType =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "select";

export interface ExitConditionalFieldDef {
  key: string;
  label: string;
  type: ExitConditionalFieldType;
  required: boolean;
  options?: string[];
}

export interface ExitClearanceTemplateItem {
  id: string;
  sequenceNumber: number;
  title: string;
  description: string;
  confirmationDepartment: ExitConfirmationDepartment;
  confirmationRole: string;
  assignmentEmailRule: ExitAssignmentEmailRule;
  fixedAssignedEmail: string;
  conditionalFields: ExitConditionalFieldDef[];
  alwaysRequiresConfirmation: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type ExitClearanceTemplateItemInput = Omit<
  ExitClearanceTemplateItem,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & { id?: string };

export interface ExitClearanceChecklistItem {
  id: string;
  sequenceNumber: number;
  title: string;
  description: string;
  employeeAnswer: ExitEmployeeAnswer;
  conditionalFields: ExitConditionalFieldDef[];
  /** Runtime answers keyed by field key */
  conditionalValues: Record<string, string>;
  confirmationDepartment: ExitConfirmationDepartment;
  confirmationRole: string;
  confirmationAssignedEmail: string;
  confirmationStatus: ExitConfirmationStatus;
  confirmationName: string;
  confirmationInitial: string;
  confirmationDate: string | null;
  confirmationRemarks: string;
  linkedTaskId: string | null;
  required: boolean;
  sortOrder: number;
  alwaysRequiresConfirmation: boolean;
  templateItemId: string | null;
  /** When returned for correction, only this item is editable */
  unlockedForCorrection: boolean;
  confidentialRemarks: string;
}

export interface EmployeeExitClearanceForm {
  id: string;
  offboardingCaseId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  employeeEmail: string;
  personalEmail: string;
  contactNumber: string;
  department: string;
  location: string;
  managerName: string;
  managerEmail: string;
  lastWorkingDate: string;
  formDueDate: string;
  formStatus: ExitClearanceFormStatus;
  checklistItems: ExitClearanceChecklistItem[];
  employeeDeclarationConfirmed: boolean;
  employeeTypedSignature: string;
  submittedAt: string | null;
  openedAt: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  initialEmailId: string | null;
  completedEmailId: string | null;
}

export interface MockEmailAttachment {
  id: string;
  fileName: string;
  kind:
    | "exit-clearance-blank"
    | "exit-clearance-submitted"
    | "exit-clearance-completed"
    | "induction-checklist"
    | "access-card-application"
    | "first-day-guide";
  formId: string;
  openedAt: string | null;
  relatedFormType?: string | null;
  relatedFormId?: string | null;
}

export const EXIT_FORM_STATUSES: ExitClearanceFormStatus[] = [
  "Not Sent",
  "Sent",
  "Opened",
  "Draft",
  "Submitted",
  "Confirmation In Progress",
  "Returned for Correction",
  "Fully Cleared",
  "Completed",
];

export const EXIT_CONFIRMATION_DEPARTMENTS: ExitConfirmationDepartment[] = [
  "Human Resources",
  "Direct Line Manager",
  "Finance / Concur Team",
  "APAC Corporate Card Admin",
  "Administration",
];

/** Stable permanent demo IDs */
export const DANIEL_EMPLOYEE_ID = "emp-daniel-lim";
export const DANIEL_OFFBOARDING_CASE_ID = "off-daniel-lim";
export const DANIEL_EXIT_FORM_ID = "exit-form-daniel-lim";
export const DANIEL_EMAIL = "daniel.lim@ppg-demo.com";
export const DANIEL_EMPLOYEE_NUMBER = "MY-00881";
