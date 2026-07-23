/** Permanent Alicia Wong onboarding demo constants — stable deterministic IDs */

export const ALICIA_EMPLOYEE_ID = "emp-alicia-wong";
export const ALICIA_EMPLOYEE_NUMBER = "MY-00921";
export const ALICIA_EMAIL = "alicia.wong@ppg-demo.com";
export const ALICIA_CASE_NUMBER = "ONB-2026-0921";

/** Canonical stable demo IDs (do not randomize on init). */
export const ALICIA_ONBOARDING_CASE_ID = "onboarding-alicia-0921";
export const ALICIA_INDUCTION_FORM_ID = "induction-alicia-0921";
export const ALICIA_ACCESS_CARD_FORM_ID = "access-card-alicia-0921";

export const PERSONAL_INFO_TASK_TITLE = "Review Personal Information";
export const FIRST_DAY_TASK_TITLE = "Acknowledge First-Day Instructions";

/** Legacy IDs from earlier prototypes — remapped on load / ensure. */
export const ALICIA_LEGACY_IDS = {
  onboardingCase: ["onb-alicia-wong", "onboarding-alicia-wong"],
  inductionForm: ["ind-form-alicia-wong", "induction-form-alicia-wong"],
  accessCardForm: ["acc-form-alicia-wong", "access-card-alicia-wong"],
  laptopRequest: ["laptop-req-alicia-wong"],
  laptopManagerTask: ["tsk-alicia-laptop-decision"],
  laptopManagerEmail: ["mail-alicia-laptop-decision"],
} as const;

export function resolveAliciaOnboardingCaseId(id: string | null | undefined): string {
  if (!id) return ALICIA_ONBOARDING_CASE_ID;
  if (id === ALICIA_ONBOARDING_CASE_ID) return id;
  if ((ALICIA_LEGACY_IDS.onboardingCase as readonly string[]).includes(id)) {
    return ALICIA_ONBOARDING_CASE_ID;
  }
  return id;
}

export function resolveAliciaInductionFormId(id: string | null | undefined): string {
  if (!id) return ALICIA_INDUCTION_FORM_ID;
  if (id === ALICIA_INDUCTION_FORM_ID) return id;
  if ((ALICIA_LEGACY_IDS.inductionForm as readonly string[]).includes(id)) {
    return ALICIA_INDUCTION_FORM_ID;
  }
  return id;
}

export function resolveAliciaAccessCardFormId(id: string | null | undefined): string {
  if (!id) return ALICIA_ACCESS_CARD_FORM_ID;
  if (id === ALICIA_ACCESS_CARD_FORM_ID) return id;
  if ((ALICIA_LEGACY_IDS.accessCardForm as readonly string[]).includes(id)) {
    return ALICIA_ACCESS_CARD_FORM_ID;
  }
  return id;
}

export function isAliciaInductionFormId(id: string): boolean {
  return (
    id === ALICIA_INDUCTION_FORM_ID ||
    (ALICIA_LEGACY_IDS.inductionForm as readonly string[]).includes(id)
  );
}

export function isAliciaAccessCardFormId(id: string): boolean {
  return (
    id === ALICIA_ACCESS_CARD_FORM_ID ||
    (ALICIA_LEGACY_IDS.accessCardForm as readonly string[]).includes(id)
  );
}

export function isAliciaOnboardingCaseId(id: string): boolean {
  return (
    id === ALICIA_ONBOARDING_CASE_ID ||
    (ALICIA_LEGACY_IDS.onboardingCase as readonly string[]).includes(id)
  );
}

export type OnboardingEmployeeStage =
  | "Welcome"
  | "Personal Information"
  | "Forms and Documents"
  | "Access and Equipment Preparation"
  | "Induction Preparation"
  | "Ready for Day One"
  | "Completed";

export type CompanyPreparationStatus =
  | "Not Started"
  | "In Progress"
  | "On Track"
  | "Attention Required"
  | "Ready for Day One";

export interface FirstDayInstructionsContent {
  reportingDate: string;
  reportingTime: string;
  officeLocation: string;
  managerName: string;
  contactPerson: string;
  contactEmail: string;
  dressCode: string;
  itemsToBring: string[];
  parkingOrArrival: string;
  emergencyContact: string;
}
