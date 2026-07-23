import type { ChecklistGroup, ResponsibleTeam } from "./types";
import type { LifecycleProcess } from "./offboarding-types";

/** Short group labels used by checklist templates. */
export type TemplateChecklistGroup =
  | "HR"
  | "IT"
  | "Facilities"
  | "Hiring Manager"
  | "Finance";

export type AssignedEmailRule = "Fixed Team Email" | "Employee Manager Email";

export type EscalationEmailRule =
  | "Admin"
  | "HR Operations"
  | "Hiring Manager"
  | "Fixed Email";

export const ESCALATION_EMAIL_RULES: EscalationEmailRule[] = [
  "Admin",
  "HR Operations",
  "Hiring Manager",
  "Fixed Email",
];

export interface ChecklistTemplateTask {
  id: string;
  processType: LifecycleProcess;
  checklistGroup: TemplateChecklistGroup;
  responsibleTeam: ResponsibleTeam;
  title: string;
  description: string;
  active: boolean;
  required: boolean;
  sortOrder: number;
  dueOffsetDays: number;
  dependencyTemplateTaskIds: string[];
  assignedEmailRule: AssignedEmailRule;
  fixedAssignedEmail: string;
  reminderEnabled: boolean;
  firstReminderAfterWorkingDays: number;
  reminderFrequencyWorkingDays: number;
  maximumReminderCount: number;
  escalationAfterWorkingDays: number;
  escalationEmailRule: EscalationEmailRule;
  fixedEscalationEmail: string;
  securityCritical?: boolean;
  executionMode?: "Scheduled" | "Immediate" | "Manual Confirmation" | null;
  /** When true, this template item participates in the laptop PO chain. */
  requiresPurchaseOrder?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type ChecklistTemplateAuditAction =
  | "add"
  | "edit"
  | "reorder"
  | "activate"
  | "deactivate"
  | "delete";

export interface ChecklistTemplateAudit {
  id: string;
  action: ChecklistTemplateAuditAction;
  templateTaskId: string;
  taskTitle: string;
  changedBy: string;
  changedAt: string;
  before: Partial<ChecklistTemplateTask> | null;
  after: Partial<ChecklistTemplateTask> | null;
}

export const TEMPLATE_CHECKLIST_GROUPS: TemplateChecklistGroup[] = [
  "HR",
  "IT",
  "Facilities",
  "Hiring Manager",
  "Finance",
];

export const TEMPLATE_GROUP_TO_CASE_GROUP: Record<
  TemplateChecklistGroup,
  ChecklistGroup
> = {
  HR: "HR Checklist",
  IT: "IT Checklist",
  Facilities: "Facilities Checklist",
  "Hiring Manager": "Hiring Manager Checklist",
  Finance: "Finance Checklist",
};

export const CASE_GROUP_TO_TEMPLATE_GROUP: Record<
  ChecklistGroup,
  TemplateChecklistGroup
> = {
  "HR Checklist": "HR",
  "IT Checklist": "IT",
  "Facilities Checklist": "Facilities",
  "Hiring Manager Checklist": "Hiring Manager",
  "Finance Checklist": "Finance",
};

/** Valid responsible teams per template checklist group. */
export const TEAMS_FOR_TEMPLATE_GROUP: Record<
  TemplateChecklistGroup,
  ResponsibleTeam[]
> = {
  HR: ["HR Operations"],
  IT: ["IT Security", "Onsite IT Support"],
  Facilities: ["Facilities / Building Management"],
  "Hiring Manager": ["Hiring Manager"],
  Finance: ["Finance / Administration", "Administration"],
};

export type ChecklistTemplateTaskInput = Omit<
  ChecklistTemplateTask,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & {
  id?: string;
};
