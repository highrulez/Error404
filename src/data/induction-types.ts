/** Induction Checklist for New Employees */

export type InductionFormStatus =
  | "Not Sent"
  | "Sent"
  | "Opened"
  | "Draft"
  | "Sessions In Progress"
  | "Ready for Employee Acknowledgement"
  | "Submitted"
  | "Under HR Review"
  | "Returned for Correction"
  | "Completed";

export type PresenterSignatureStatus =
  | "Not Signed"
  | "Signed"
  | "Not Required";

export type InductionSectionStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Not Required"
  | "Returned for Correction";

export type InductionItemCoverage =
  | "Pending"
  | "Covered"
  | "Not Applicable"
  | "Follow-up Required";

export interface InductionChecklistItem {
  id: string;
  label: string;
  sortOrder: number;
  coverage?: InductionItemCoverage;
}

export interface InductionSection {
  id: string;
  sectionName: string;
  items: InductionChecklistItem[];
  completedOn: string | null;
  presenterName: string;
  presenterInitials: string;
  presenterSignatureStatus: PresenterSignatureStatus;
  employeeAcknowledged: boolean;
  remarks: string;
  /** When false, section may be skipped for non-exempt / job-profile rules */
  required?: boolean;
  /** Extended presenter-section workflow fields */
  status?: InductionSectionStatus;
  responsibleRole?: string;
  assignedEmail?: string;
  presenterUserId?: string | null;
  presenterEmail?: string;
  presenterRemarks?: string;
  confirmedAt?: string | null;
  linkedTaskId?: string | null;
  sortOrder?: number;
  applicabilityRule?: string | null;
  requiredForEmployee?: boolean;
  notRequiredReason?: string;
}

export interface InductionChecklistForm {
  id: string;
  lifecycleCaseId: string;
  lifecycleType: "Onboarding" | "Offboarding";
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  formStatus: InductionFormStatus;
  inductionSections: InductionSection[];
  employeeDeclaration: boolean;
  typedSignature: string;
  /** Final employee acknowledgement (mirrors declaration after submit) */
  employeeAcknowledged?: boolean;
  employeeTypedSignature?: string;
  employeeAcknowledgedAt?: string | null;
  acknowledgementDate: string | null;
  hrReceivedDate: string | null;
  hrRemarks: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  linkedEmployeeTaskId: string | null;
  linkedReviewTaskId: string | null;
  formDueDate: string | null;
  initialEmailId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const INDUCTION_EMPLOYEE_TASK_TITLE = "Complete Induction Checklist";
export const INDUCTION_REVIEW_TASK_TITLE_PREFIX = "Review Induction Checklist";
export const INDUCTION_REVIEW_TASK_TITLE = "Review Completed Induction Checklist";

/** Stable section IDs — never randomize. */
export const INDUCTION_SECTION_IDS = {
  hr: "induction-section-hr",
  ethics: "induction-section-ethics",
  it: "induction-section-it",
  ehs: "induction-section-ehs",
  finance: "induction-section-finance",
  quality: "induction-section-quality",
  productStewardship: "induction-section-product-stewardship",
} as const;

export type InductionSectionId =
  (typeof INDUCTION_SECTION_IDS)[keyof typeof INDUCTION_SECTION_IDS];

export const INDUCTION_SECTION_NAMES: Record<InductionSectionId, string> = {
  [INDUCTION_SECTION_IDS.hr]: "Human Resources Induction",
  [INDUCTION_SECTION_IDS.ethics]: "Ethics and Compliance Induction",
  [INDUCTION_SECTION_IDS.it]: "IT Induction",
  [INDUCTION_SECTION_IDS.ehs]: "EHS Induction",
  [INDUCTION_SECTION_IDS.finance]: "Finance and CONCUR Induction",
  [INDUCTION_SECTION_IDS.quality]: "Quality Induction",
  [INDUCTION_SECTION_IDS.productStewardship]: "Product Stewardship Induction",
};

export function normalizeInductionSectionName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveInductionSectionId(
  section: Pick<InductionSection, "id" | "sectionName">
): string {
  const known = Object.values(INDUCTION_SECTION_IDS) as string[];
  if (known.includes(section.id)) return section.id;
  const norm = normalizeInductionSectionName(section.sectionName || "");
  for (const [id, name] of Object.entries(INDUCTION_SECTION_NAMES)) {
    if (normalizeInductionSectionName(name) === norm) return id;
  }
  // Legacy fuzzy matches
  if (norm.includes("human resources")) return INDUCTION_SECTION_IDS.hr;
  if (norm.includes("ethics")) return INDUCTION_SECTION_IDS.ethics;
  if (norm === "it induction" || norm.startsWith("it ")) return INDUCTION_SECTION_IDS.it;
  if (norm.includes("ehs")) return INDUCTION_SECTION_IDS.ehs;
  if (norm.includes("finance") || norm.includes("concur"))
    return INDUCTION_SECTION_IDS.finance;
  if (norm.includes("quality")) return INDUCTION_SECTION_IDS.quality;
  if (norm.includes("product stewardship") || norm.includes("stewardship"))
    return INDUCTION_SECTION_IDS.productStewardship;
  return section.id;
}

export function isSectionCleared(section: InductionSection): boolean {
  const status = section.status;
  if (status === "Completed" || status === "Not Required") return true;
  if (section.presenterSignatureStatus === "Signed") return true;
  if (section.presenterSignatureStatus === "Not Required") return true;
  return false;
}

export function isSectionRequired(section: InductionSection): boolean {
  if (section.requiredForEmployee === false) return false;
  if (section.status === "Not Required") return false;
  return section.required !== false;
}
