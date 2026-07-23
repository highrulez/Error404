/** UOA Security Access Card Application */

export type AccessCardFormStatus =
  | "Not Sent"
  | "Sent"
  | "Opened"
  | "Draft"
  | "Submitted"
  | "Under Administration Review"
  | "Returned for Correction"
  | "Approved"
  | "Card Issued"
  | "Completed";

export type IdentityDocumentType = "NRIC" | "Passport" | "Other";

export type GenderOption = "Male" | "Female" | "Prefer not to say" | "";

export interface AccessCardOfficeUse {
  cardNumber: string;
  pin: string;
  activationDate: string;
  expiryDate: string;
  receiptNumber: string;
  administrationRemarks: string;
}

export interface SecurityAccessCardApplication {
  id: string;
  lifecycleCaseId: string;
  lifecycleType: "Onboarding" | "Offboarding";
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  companyNameOnCard: string;
  locationUnit: string;
  applicantName: string;
  gender: GenderOption;
  officeTelephone: string;
  mobileTelephone: string;
  nameOnCard: string;
  identityDocumentType: IdentityDocumentType | "";
  identityDocumentNumber: string;
  /** Local mock data URL or demo marker — never uploaded externally */
  photoAttachmentId: string | null;
  photoDataUrl: string | null;
  employeeDeclarationConfirmed: boolean;
  employeeTypedSignature: string;
  submittedAt: string | null;
  formStatus: AccessCardFormStatus;
  officeUseOnly: AccessCardOfficeUse;
  reviewedAt: string | null;
  reviewedBy: string | null;
  linkedEmployeeTaskId: string | null;
  linkedReviewTaskId: string | null;
  formDueDate: string | null;
  initialEmailId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ACCESS_CARD_EMPLOYEE_TASK_TITLE =
  "Complete UOA Security Access Card Application";
export const ACCESS_CARD_REVIEW_TASK_TITLE_PREFIX =
  "Review UOA Security Access Card Application";

export const ACCESS_CARD_LOCATIONS = [
  "L6-1",
  "L7-1",
  "Malaysia – UOA Business Park",
] as const;

export function accessCardFormProgress(
  form: SecurityAccessCardApplication
): number {
  const checks = [
    Boolean(form.companyNameOnCard.trim()),
    Boolean(form.locationUnit.trim()),
    Boolean(form.applicantName.trim()),
    Boolean(form.gender),
    Boolean(form.mobileTelephone.trim()),
    Boolean(form.nameOnCard.trim()),
    Boolean(form.identityDocumentType),
    Boolean(form.identityDocumentNumber.trim()),
    Boolean(form.photoDataUrl || form.photoAttachmentId),
    form.employeeDeclarationConfirmed && Boolean(form.employeeTypedSignature.trim()),
  ];
  const done = checks.filter(Boolean).length;
  let pct = Math.round((done / checks.length) * 85);
  if (
    [
      "Submitted",
      "Under Administration Review",
      "Approved",
      "Card Issued",
      "Completed",
    ].includes(form.formStatus)
  ) {
    pct =
      form.formStatus === "Card Issued" || form.formStatus === "Completed"
        ? 100
        : 90;
  }
  return pct;
}
