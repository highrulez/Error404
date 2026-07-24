import type { MockEmail } from "../auth-types";
import type { ChecklistTask, Employee } from "../types";

export const IT_SECURITY_ACCOUNT_TASKS = [
  "Create Network ID",
  "Create Email",
  "SailPoint Access",
] as const;

export const ACCOUNT_CREATED_RECIPIENT = "itsupport@ppg-demo.com";
export const ACCOUNT_CREATED_FROM = "sailpoint.communications@ppg-demo.com";

export function areItSecurityAccountTasksComplete(
  tasks: ChecklistTask[]
): boolean {
  return IT_SECURITY_ACCOUNT_TASKS.every((title) => {
    const task = tasks.find((t) => t.title === title);
    return task?.status === "Completed";
  });
}

/** Skip generic dependency-unlock email; Account Created workflow handles it. */
export function shouldSkipGenericOnsiteUnlockEmail(
  unlockedTasks: ChecklistTask[]
): boolean {
  if (unlockedTasks.length !== 1) return false;
  const t = unlockedTasks[0];
  if (t.responsibleTeam !== "Onsite IT Support") return false;
  return (
    t.title === "Laptop Assigned" ||
    t.title === "Prepare Laptop" ||
    /^Prepare Laptop/i.test(t.title) ||
    Boolean(t.isLaptopPrepareTask)
  );
}

function slugifyName(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .replace(/\b(binti|bin|a\/l|al|van|de|der)\b/gi, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}`;
  }
  return parts[0] ?? "newhire";
}

export function deriveUniversalLogin(employee: Employee): string {
  return slugifyName(employee.fullName);
}

export function deriveNetworkLoginId(employee: Employee): string {
  const slug = slugifyName(employee.fullName).replace(/\./g, "");
  const suffix = employee.employeeNumber.replace(/\D/g, "").slice(-3) || "001";
  return `${slug}${suffix}`;
}

export function deriveWorkEmail(employee: Employee): string {
  if (employee.email?.includes("@")) return employee.email;
  return `${deriveUniversalLogin(employee)}@ppg-demo.com`;
}

export interface AccountIdentityFields {
  universalLogin: string;
  networkLoginId: string;
  temporaryPassword: string;
  ppgId: string;
  workEmail: string;
}

export function buildAccountIdentityFields(
  employee: Employee
): AccountIdentityFields {
  return {
    universalLogin: deriveUniversalLogin(employee),
    networkLoginId: deriveNetworkLoginId(employee),
    temporaryPassword: "Demo-Password-Only",
    ppgId: employee.employeeNumber || employee.id,
    workEmail: deriveWorkEmail(employee),
  };
}

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

export function buildAccountCreatedEmailHtml(args: {
  employee: Employee;
  onboardingCaseId: string;
  identity: AccountIdentityFields;
}): string {
  const { employee, onboardingCaseId, identity } = args;
  const caseUrl = `/oneflow/cases/${onboardingCaseId}`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:160px;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:600;">${value}</td>
    </tr>`;

  return `
<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ea580c 0%,#f97316 100%);padding:20px 24px;color:#ffffff;">
      <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">SailPoint Communications</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;">PPG IT Security</p>
    </div>
    <div style="padding:28px 24px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;font-weight:700;">Account Created</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
        The following employee or contractor network account and email mailbox have been created:
      </p>
      <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
        ${row("Name", employee.fullName)}
        ${row("Universal Login", identity.universalLogin)}
        ${row("Network Login ID", identity.networkLoginId)}
        ${row("Temporary Password", identity.temporaryPassword)}
        ${row("PPG ID", identity.ppgId)}
        ${row("Job Title", employee.role)}
        ${row("Hire Date", formatHireDate(employee.startDate))}
        ${row("Location", employee.location)}
        ${row("Email", identity.workEmail)}
      </table>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#9a3412;">Employee Onboarding</p>
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.7;">
          <li>Change your password during your first login.</li>
          <li>Enable Multi-Factor Authentication.</li>
          <li>Update your SailPoint profile.</li>
          <li>Contact IT Support if account access fails.</li>
        </ol>
      </div>
      <a href="${caseUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">Open OneFlow Case</a>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
        Prototype notification generated by OneFlow Mock Automation.<br/>
        No real account or password has been created.
      </p>
    </div>
  </div>
</div>`;
}

export function buildAccountCreatedEmail(args: {
  employee: Employee;
  onboardingCaseId: string;
  automationRunId: string;
  emailId?: string;
}): MockEmail {
  const { employee, onboardingCaseId, automationRunId, emailId } = args;
  const identity = buildAccountIdentityFields(employee);

  return {
    id: emailId ?? `mail-acct-${Math.random().toString(36).slice(2, 9)}`,
    automationRunId,
    from: ACCOUNT_CREATED_FROM,
    to: ACCOUNT_CREATED_RECIPIENT,
    cc: ["admin@ppg-demo.com"],
    subject: `Account Created – ${employee.fullName}`,
    htmlBody: buildAccountCreatedEmailHtml({
      employee,
      onboardingCaseId,
      identity,
    }),
    sentAt: new Date().toISOString(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId,
    responsibleTeam: "Onsite IT Support",
  };
}
