import type { SecurityAccessCardApplication } from "./access-card-types";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankAccessCardForm(args: {
  id?: string;
  lifecycleCaseId: string;
  lifecycleType: "Onboarding" | "Offboarding";
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  dueDate?: string | null;
}): SecurityAccessCardApplication {
  const ts = new Date().toISOString();
  return {
    id: args.id || uid("acc-form"),
    lifecycleCaseId: args.lifecycleCaseId,
    lifecycleType: args.lifecycleType,
    employeeId: args.employeeId,
    employeeName: args.employeeName,
    employeeEmail: args.employeeEmail,
    companyNameOnCard: "PPG",
    locationUnit: "L6-1",
    applicantName: args.employeeName,
    gender: "",
    officeTelephone: "",
    mobileTelephone: "",
    nameOnCard: args.employeeName.split(/\s+/).slice(0, 2).join(" ").slice(0, 12),
    identityDocumentType: "",
    identityDocumentNumber: "",
    photoAttachmentId: null,
    photoDataUrl: null,
    employeeDeclarationConfirmed: false,
    employeeTypedSignature: "",
    submittedAt: null,
    formStatus: "Not Sent",
    officeUseOnly: {
      cardNumber: "",
      pin: "",
      activationDate: "",
      expiryDate: "",
      receiptNumber: "",
      administrationRemarks: "",
    },
    reviewedAt: null,
    reviewedBy: null,
    linkedEmployeeTaskId: null,
    linkedReviewTaskId: null,
    formDueDate: args.dueDate ?? null,
    initialEmailId: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function fileNameForAccessCard(employeeName: string): string {
  return `${employeeName.replace(/\s+/g, "_")}_UOA_Security_Access_Card_Application.pdf`;
}

/** Tiny SVG portrait used as demo photo (data URL). */
export const DEMO_PHOTO_DATA_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">
      <rect width="240" height="320" fill="#e2e8f0"/>
      <circle cx="120" cy="110" r="48" fill="#94a3b8"/>
      <ellipse cx="120" cy="250" rx="70" ry="80" fill="#94a3b8"/>
      <text x="120" y="300" text-anchor="middle" font-family="Segoe UI,Arial" font-size="14" fill="#475569">Demo Photo</text>
    </svg>`
  );
