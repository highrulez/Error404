/**
 * SailPoint-style IT Security → Onsite IT equipment handoff.
 * Never blocked by laptop purchase / PO / delivery.
 */

import type { MockEmail } from "../auth-types";
import type { ChecklistTask, Employee } from "../types";
import {
  ACCOUNT_CREATED_FROM,
  ACCOUNT_CREATED_RECIPIENT,
  buildAccountIdentityFields,
  type AccountIdentityFields,
} from "./account-created-workflow";
import type { LaptopRequest } from "../laptop-request-types";
import {
  deriveEquipmentPath,
  deriveLaptopDecisionStage,
  deriveProcurementStage,
} from "../laptop-request-types";

export const ONSITE_IT_SUPPORT_EMAIL = ACCOUNT_CREATED_RECIPIENT; // itsupport@ppg-demo.com
export const SAILPOINT_HANDOFF_NOTIFICATION_TYPE =
  "SailPoint Provisioning Complete";

function formatHireDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function equipmentPathLabel(req: LaptopRequest | null | undefined): string {
  if (!req) return "Equipment Decision Pending";
  const path = req.equipmentPath || deriveEquipmentPath(req);
  switch (path) {
    case "New Laptop Temporary Spare":
      return "New Laptop + Temporary Spare";
    case "Reuse Existing Laptop":
      return "Reuse Existing Laptop";
    case "Not Required":
      return "Equipment Not Required";
    default:
      return "Equipment Decision Pending";
  }
}

export function laptopDecisionLabel(req: LaptopRequest | null | undefined): string {
  if (!req) return "Pending Manager Decision";
  return req.laptopDecisionStage || deriveLaptopDecisionStage(req);
}

export function buildSailPointHandoffEmailHtml(args: {
  employee: Employee;
  onboardingCaseId: string;
  identity: AccountIdentityFields;
  laptopRequest?: LaptopRequest | null;
  prepareTaskId?: string | null;
}): string {
  const { employee, onboardingCaseId, identity, laptopRequest, prepareTaskId } =
    args;
  const taskUrl = prepareTaskId
    ? `/oneflow/tasks/${prepareTaskId}`
    : `/oneflow/cases/${onboardingCaseId}`;
  const decision = laptopDecisionLabel(laptopRequest);
  const path = equipmentPathLabel(laptopRequest);
  const requiredBy =
    laptopRequest?.requiredDeliveryDate ||
    employee.startDate ||
    "—";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:180px;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;

  return `
<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ea580c 0%,#f97316 100%);padding:20px 24px;color:#ffffff;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">SailPoint Communications</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;">PPG IT Security → Onsite IT Support</p>
    </div>
    <div style="padding:28px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;font-weight:700;">SailPoint Provisioning Complete</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
        IT Security provisioning is complete. Please prepare equipment for the new hire's first day.
        This handoff is <strong>not blocked</strong> by laptop purchase or delivery.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
        ${row("Employee Name", employee.fullName)}
        ${row("Employee ID", employee.employeeNumber || employee.id)}
        ${row("Job Title", employee.role)}
        ${row("Department", employee.department)}
        ${row("Manager", employee.managerName)}
        ${row("Start Date", formatHireDate(employee.startDate))}
        ${row("Office Location", employee.location)}
        ${row("Network ID", identity.networkLoginId)}
        ${row("Company Email", identity.workEmail)}
        ${row("SailPoint Provisioning", "Complete")}
        ${row("Laptop Decision", decision)}
        ${row("Equipment Fulfillment Path", path)}
        ${row("Required-By Date", requiredBy)}
      </table>
      <a href="${taskUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">Open OneFlow Equipment Task</a>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
        Prototype notification generated by OneFlow. Recipient is Onsite IT Support (${ONSITE_IT_SUPPORT_EMAIL}).
      </p>
    </div>
  </div>
</div>`;
}

export function buildSailPointHandoffEmail(args: {
  employee: Employee;
  onboardingCaseId: string;
  automationRunId: string;
  emailId?: string;
  laptopRequest?: LaptopRequest | null;
  prepareTaskId?: string | null;
}): MockEmail {
  const {
    employee,
    onboardingCaseId,
    automationRunId,
    emailId,
    laptopRequest,
    prepareTaskId,
  } = args;
  const identity = buildAccountIdentityFields(employee);

  return {
    id: emailId ?? `mail-sailpoint-handoff-${Date.now().toString(36)}`,
    automationRunId,
    from: ACCOUNT_CREATED_FROM,
    to: ONSITE_IT_SUPPORT_EMAIL,
    cc: ["admin@ppg-demo.com"],
    subject: `SailPoint Provisioning Complete — Prepare Equipment for ${employee.fullName}`,
    htmlBody: buildSailPointHandoffEmailHtml({
      employee,
      onboardingCaseId,
      identity,
      laptopRequest,
      prepareTaskId,
    }),
    sentAt: new Date().toISOString(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId,
    responsibleTeam: "Onsite IT Support",
    notificationType: SAILPOINT_HANDOFF_NOTIFICATION_TYPE,
    relatedTaskId: prepareTaskId || null,
    sourceType: "IT Security Provisioning",
    sourceRecordId: onboardingCaseId,
  };
}

/** True when a successful SailPoint handoff notification already exists for the case. */
export function hasSuccessfulSailPointHandoff(
  emails: MockEmail[],
  caseId: string
): boolean {
  return emails.some(
    (e) =>
      e.onboardingCaseId === caseId &&
      (e.notificationType === SAILPOINT_HANDOFF_NOTIFICATION_TYPE ||
        /^SailPoint Provisioning Complete/i.test(e.subject) ||
        /^Account Created/i.test(e.subject)) &&
      e.to.toLowerCase() === ONSITE_IT_SUPPORT_EMAIL &&
      (e.deliveryStatus === "Sent" ||
        e.deliveryStatus === "Mock Only" ||
        (!e.deliveryStatus && e.status !== "Deleted"))
  );
}

export function isPrepareLaptopTask(t: ChecklistTask): boolean {
  return (
    Boolean(t.isLaptopPrepareTask) ||
    t.title === "Prepare Laptop" ||
    /^Prepare Laptop/i.test(t.title)
  );
}

export function syncLaptopRequestStages(
  req: LaptopRequest,
  extras?: Partial<LaptopRequest>
): LaptopRequest {
  const merged = { ...req, ...extras };
  const path = merged.equipmentPath || deriveEquipmentPath(merged);
  const decision = merged.laptopDecisionStage || deriveLaptopDecisionStage(merged);
  const procurement =
    merged.procurementStage || deriveProcurementStage(merged);
  return {
    ...merged,
    equipmentPath: path,
    laptopDecisionStage: decision,
    procurementStage: procurement,
  };
}
