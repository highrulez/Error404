/** Shared employee-safe lifecycle DTOs (onboarding + offboarding). */

import type {
  CompanyPreparationStatus,
  FirstDayInstructionsContent,
  OnboardingEmployeeStage,
} from "./alicia-types";
import type {
  EmployeeFacingClearanceStatus,
  EmployeeSafeActivity,
  EmployeeSafeFormSummary,
  EmployeeSafeTaskSummary,
} from "./employee-safe-types";

export type {
  EmployeeSafeActivity,
  EmployeeSafeFormSummary,
  EmployeeSafeTaskSummary,
} from "./employee-safe-types";

export interface EmployeeLifecycleSummary {
  caseId: string;
  caseReference: string;
  lifecycleType: "Onboarding" | "Offboarding";
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  location: string;
  managerName: string;
  employeeStatus: string;
  importantDate: string | null;
  daysUntilImportantDate?: number;
  employeeActionProgress: number;
  employeeActionsCompleted: number;
  employeeActionsTotal: number;
  companyPreparationStatus?: CompanyPreparationStatus;
  clearanceStatus?: EmployeeFacingClearanceStatus;
  currentStage: OnboardingEmployeeStage | string;
  forms: EmployeeSafeFormSummary[];
  employeeTasks: EmployeeSafeTaskSummary[];
  safeActivities: EmployeeSafeActivity[];
  contacts: { label: string; email: string }[];
  firstDay?: FirstDayInstructionsContent;
  equipmentStatus?: import("./laptop-request-types").EmployeeSafeEquipmentStatus;
  equipmentEstimatedReadiness?: string | null;
}
