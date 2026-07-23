/**
 * Controlled workflow email delivery — server-only.
 * Recipients are resolved from mock @ppg-demo.com addresses via env mapping.
 * Clients may not supply arbitrary real email addresses.
 */

import type {
  EmailDeliveryMode,
  EmailDeliveryProvider,
  EmailDeliveryStatus,
  WorkflowEmailAction,
} from "@/data/auth-types";
import {
  getEmailServerConfig,
  maskEmail,
  resolveMappedRecipient,
} from "./config";
import { escapeHtml, openFormButton, wrapEmailDocument } from "./html";
import { sendViaSes, type SesAttachment } from "./ses-client";

const ALLOWED_ACTIONS = new Set<WorkflowEmailAction>([
  "sendLaptopDecisionEmail",
  "sendLaptopPurchaseOrderEmail",
  "sendInductionPresenterAssignmentEmail",
  "sendInductionReviewEmail",
  "sendAccessCardReviewEmail",
  "sendExitClearanceEmail",
  "sendTaskReminderEmail",
  "sendEscalationEmail",
  "sendWorkflowCompletionEmail",
  "sendTestSesEmail",
  "retryFailedEmail",
  "resendWorkflowEmail",
]);

const PPG_DEMO_SUFFIX = "@ppg-demo.com";

export interface WorkflowEmailRequest {
  action: WorkflowEmailAction;
  /** Mock / simulated recipient — must be @ppg-demo.com */
  toMock: string;
  ccMock?: string[];
  subject: string;
  htmlBody: string;
  notificationId: string;
  notificationType: string;
  sourceType?: string | null;
  sourceRecordId?: string | null;
  /** Optional PDF / text attachments (already validated client-side size) */
  attachments?: SesAttachment[];
  /** Prefer Open Form link over attachment for employee action emails */
  openFormPath?: string | null;
  openFormLabel?: string | null;
  session: {
    email: string;
    role: string;
    name?: string;
  };
  /** Force send even if previously Sent (Admin resend) */
  forceResend?: boolean;
  previousProviderMessageId?: string | null;
  previousDeliveryStatus?: EmailDeliveryStatus | null;
}

export interface WorkflowEmailResponse {
  ok: boolean;
  error?: string;
  deliveryMode: EmailDeliveryMode;
  provider: EmailDeliveryProvider;
  deliveryStatus: EmailDeliveryStatus;
  providerMessageId: string | null;
  deliveryAttemptCount: number;
  sentAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  lastAttemptAt: string;
  mappedRecipientMasked: string | null;
  simulatedRecipient: string;
  /** Server-side duplicate skip */
  skippedDuplicate?: boolean;
}

/** In-memory dedupe for the Node process (complements client-side checks). */
const recentSends = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

function dedupeKey(req: WorkflowEmailRequest): string {
  return [
    req.notificationType,
    req.sourceRecordId || "",
    req.toMock.toLowerCase(),
    req.forceResend ? req.notificationId : "",
  ].join("|");
}

function assertAuthorized(req: WorkflowEmailRequest): string | null {
  const role = req.session.role;
  // Employees must not trigger arbitrary sends
  if (role === "ONBOARDING_EMPLOYEE" || role === "OFFBOARDING_EMPLOYEE") {
    return "Employees cannot trigger external email delivery.";
  }
  if (
    req.action === "sendTestSesEmail" ||
    req.action === "retryFailedEmail" ||
    req.action === "resendWorkflowEmail"
  ) {
    if (role !== "Admin") return "Admin authorization required.";
  }
  // Workflow triggers may come from Admin/HR/system actors during prototype demos
  const allowed =
    role === "Admin" ||
    role === "HR" ||
    role === "HIRING_MANAGER" ||
    role === "IT_SECURITY" ||
    role === "FACILITIES" ||
    role === "FINANCE" ||
    role === "ONSITE_IT" ||
    role === "QUALITY" ||
    role === "PRODUCT_STEWARDSHIP" ||
    role === "CORPORATE_CARD" ||
    role === "ADMINISTRATION";
  if (!allowed) {
    return "Not authorized to trigger workflow email delivery.";
  }
  return null;
}

function assertMockAddress(addr: string): string | null {
  const normalized = addr.trim().toLowerCase();
  if (!normalized.endsWith(PPG_DEMO_SUFFIX)) {
    return "Only @ppg-demo.com simulated recipients are accepted.";
  }
  if (normalized.includes(",") || normalized.includes(";")) {
    return "Invalid recipient format.";
  }
  return null;
}

function buildHtml(req: WorkflowEmailRequest, appUrl: string): string {
  let body = req.htmlBody || "";
  // Strip any accidental script tags from client-rendered prototype HTML
  body = body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  if (req.openFormPath) {
    const href = `${appUrl}${req.openFormPath.startsWith("/") ? "" : "/"}${req.openFormPath}`;
    body += openFormButton(href, req.openFormLabel || "Open OneFlow Form");
  }
  return wrapEmailDocument(body);
}

export async function deliverWorkflowEmail(
  req: WorkflowEmailRequest
): Promise<WorkflowEmailResponse> {
  const cfg = getEmailServerConfig();
  const now = new Date().toISOString();
  // Canonicalize legacy administration@ before resolve / audit
  const toMock =
    req.toMock.trim().toLowerCase() === "administration@ppg-demo.com"
      ? "admin@ppg-demo.com"
      : req.toMock.trim();
  const ccMock = (req.ccMock || []).map((c) =>
    c.trim().toLowerCase() === "administration@ppg-demo.com"
      ? "admin@ppg-demo.com"
      : c.trim()
  );
  req = { ...req, toMock, ccMock };

  console.log(`[Workflow] ${req.action} · ${req.notificationType || req.subject}`);
  console.log(`[Notification] Creating notification... id=${req.notificationId} to=${req.toMock}`);
  const baseMeta = {
    deliveryMode: cfg.mode,
    simulatedRecipient: req.toMock,
    lastAttemptAt: now,
  };

  if (!ALLOWED_ACTIONS.has(req.action)) {
    return {
      ok: false,
      error: "Unsupported workflow email action.",
      provider: "none",
      deliveryStatus: "Failed",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: null,
      failedAt: now,
      failureReason: "Unsupported action",
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  const authErr = assertAuthorized(req);
  if (authErr) {
    return {
      ok: false,
      error: authErr,
      provider: "none",
      deliveryStatus: "Failed",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: null,
      failedAt: now,
      failureReason: authErr,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  const toErr = assertMockAddress(req.toMock);
  if (toErr) {
    return {
      ok: false,
      error: toErr,
      provider: "none",
      deliveryStatus: "Failed",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: null,
      failedAt: now,
      failureReason: toErr,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  for (const cc of req.ccMock || []) {
    const ccErr = assertMockAddress(cc);
    if (ccErr) {
      return {
        ok: false,
        error: ccErr,
        provider: "none",
        deliveryStatus: "Failed",
        providerMessageId: null,
        deliveryAttemptCount: 1,
        sentAt: null,
        failedAt: now,
        failureReason: ccErr,
        mappedRecipientMasked: null,
        ...baseMeta,
      };
    }
  }

  // Duplicate prevention (unless Admin force resend / retry)
  if (!req.forceResend && req.previousDeliveryStatus === "Sent") {
    return {
      ok: true,
      skippedDuplicate: true,
      provider: (req.previousProviderMessageId ? "ses" : "mock") as EmailDeliveryProvider,
      deliveryStatus: "Sent",
      providerMessageId: req.previousProviderMessageId || null,
      deliveryAttemptCount: 0,
      sentAt: now,
      failedAt: null,
      failureReason: null,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  const key = dedupeKey(req);
  const last = recentSends.get(key);
  if (!req.forceResend && last && Date.now() - last < DEDUPE_WINDOW_MS) {
    return {
      ok: true,
      skippedDuplicate: true,
      provider: cfg.mode === "mock" ? "mock" : "ses",
      deliveryStatus: cfg.mode === "mock" ? "Mock Only" : "Sent",
      providerMessageId: null,
      deliveryAttemptCount: 0,
      sentAt: now,
      failedAt: null,
      failureReason: null,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  // mock-only mode: no SES call
  if (cfg.mode === "mock") {
    recentSends.set(key, Date.now());
    console.log("[Notification] EMAIL_MODE=mock — Mock Inbox only");
    console.log("[Notification] Delivery Successful (Mock Only)");
    return {
      ok: true,
      provider: "mock",
      deliveryStatus: "Mock Only",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: now,
      failedAt: null,
      failureReason: null,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  console.log(
    `[Notification] EMAIL_MODE=${cfg.mode} — sending via AWS SES to mapped recipient for ${req.toMock}`
  );

  const { mapped, missing } = resolveMappedRecipient(req.toMock, cfg.recipientMap);
  if (missing || !mapped) {
    const reason = `No recipient mapping for ${escapeHtml(req.toMock)}`;
    return {
      ok: false,
      error: reason,
      provider: "ses",
      deliveryStatus: "Failed",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: null,
      failedAt: now,
      failureReason: reason,
      mappedRecipientMasked: null,
      ...baseMeta,
    };
  }

  const ccReal: string[] = [];
  for (const cc of req.ccMock || []) {
    const resolved = resolveMappedRecipient(cc, cfg.recipientMap);
    if (resolved.mapped) ccReal.push(resolved.mapped);
  }

  const html = buildHtml(req, cfg.appUrl);
  const sesResult = await sendViaSes({
    to: [mapped],
    cc: ccReal,
    subject: req.subject.slice(0, 200),
    htmlBody: html,
    attachments: req.attachments,
  });

  recentSends.set(key, Date.now());

  if (!sesResult.ok) {
    console.warn("[Notification] SES failed");
    console.warn("[Notification] Reason:", sesResult.error || "SES delivery failed");
    return {
      ok: false,
      error: sesResult.error || "SES delivery failed",
      provider: "ses",
      deliveryStatus: "Failed",
      providerMessageId: null,
      deliveryAttemptCount: 1,
      sentAt: null,
      failedAt: now,
      failureReason: sesResult.error || "SES delivery failed",
      mappedRecipientMasked: maskEmail(mapped),
      ...baseMeta,
    };
  }

  console.log(`[Notification] SES MessageId=${sesResult.messageId || "—"}`);
  console.log("[Notification] Delivery Successful");

  return {
    ok: true,
    provider: "ses",
    deliveryStatus: "Sent",
    providerMessageId: sesResult.messageId || null,
    deliveryAttemptCount: 1,
    sentAt: now,
    failedAt: null,
    failureReason: null,
    mappedRecipientMasked: maskEmail(mapped),
    ...baseMeta,
  };
}

/** Named exports matching the controlled method list (thin wrappers). */
export const sendLaptopDecisionEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendLaptopDecisionEmail" });
export const sendLaptopPurchaseOrderEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendLaptopPurchaseOrderEmail" });
export const sendInductionPresenterAssignmentEmail = (
  req: Omit<WorkflowEmailRequest, "action">
) => deliverWorkflowEmail({ ...req, action: "sendInductionPresenterAssignmentEmail" });
export const sendInductionReviewEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendInductionReviewEmail" });
export const sendAccessCardReviewEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendAccessCardReviewEmail" });
export const sendExitClearanceEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendExitClearanceEmail" });
export const sendTaskReminderEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendTaskReminderEmail" });
export const sendEscalationEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendEscalationEmail" });
export const sendWorkflowCompletionEmail = (req: Omit<WorkflowEmailRequest, "action">) =>
  deliverWorkflowEmail({ ...req, action: "sendWorkflowCompletionEmail" });

export function getPublicEmailSettings() {
  const cfg = getEmailServerConfig();

  const PURPOSE: Record<string, string> = {
    "admin@ppg-demo.com": "Admin / Administration workflows",
    "hr@ppg-demo.com": "HR Operations",
    "manager@ppg-demo.com": "Hiring Manager",
    "itsecurity@ppg-demo.com": "IT Security / Onsite IT Support",
    "facilities@ppg-demo.com": "Facilities (non-induction)",
    "finance@ppg-demo.com": "Finance",
    "alicia.wong@ppg-demo.com": "Onboarding Demo Employee — Alicia Wong",
    "daniel.lim@ppg-demo.com": "Offboarding Demo Employee — Daniel Lim",
  };

  const mappings = Object.entries(cfg.recipientMap)
    .filter(([mock]) => mock !== "administration@ppg-demo.com")
    .map(([mock, real]) => ({
      simulated: mock,
      purpose: PURPOSE[mock] || "Workflow recipient",
      mappedMasked: maskEmail(real),
      configured: true,
    }));

  // Always show common demo accounts even if unmapped
  const defaults = [
    "admin@ppg-demo.com",
    "hr@ppg-demo.com",
    "manager@ppg-demo.com",
    "itsecurity@ppg-demo.com",
    "facilities@ppg-demo.com",
    "finance@ppg-demo.com",
    "alicia.wong@ppg-demo.com",
    "daniel.lim@ppg-demo.com",
  ];
  for (const d of defaults) {
    if (!mappings.some((m) => m.simulated === d)) {
      mappings.push({
        simulated: d,
        purpose: PURPOSE[d] || "Workflow recipient",
        mappedMasked: "— not mapped —",
        configured: false,
      });
    }
  }

  // Prefer a stable display order (Admin + demo employees first)
  const order = new Map(defaults.map((d, i) => [d, i]));
  mappings.sort(
    (a, b) =>
      (order.get(a.simulated) ?? 99) - (order.get(b.simulated) ?? 99) ||
      a.simulated.localeCompare(b.simulated)
  );

  return {
    mode: cfg.mode,
    region: cfg.region,
    fromEmailConfigured: Boolean(cfg.fromEmail),
    fromName: cfg.fromName,
    credentialsConfigured: cfg.hasCredentials,
    appUrl: cfg.appUrl,
    mappings,
  };
}
