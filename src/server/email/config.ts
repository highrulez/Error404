import { readSavedEmailSettings } from "./settings-store";

/**
 * Server-only email configuration.
 * Never import this module from client components.
 */

export type EmailMode = "mock" | "ses" | "both";

export interface EmailServerConfig {
  mode: EmailMode;
  region: string;
  fromEmail: string;
  fromName: string;
  appUrl: string;
  hasCredentials: boolean;
  recipientMap: Record<string, string>;
}

const LEGACY_ADMINISTRATION = "administration@ppg-demo.com";
const ADMIN_MOCK = "admin@ppg-demo.com";

function readMode(): EmailMode {
  const raw = (process.env.EMAIL_MODE || "mock").trim().toLowerCase();
  if (raw === "ses" || raw === "both") return raw;
  return "mock";
}

export function getEmailServerConfig(): EmailServerConfig {
  const saved = readSavedEmailSettings();
  const accessKey = process.env.AWS_ACCESS_KEY_ID?.trim() || "";
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || "";
  return {
    mode: saved.mode || readMode(),
    region: saved.region || process.env.AWS_REGION?.trim() || "ap-southeast-1",
    fromEmail: saved.fromEmail ?? process.env.SES_FROM_EMAIL?.trim() ?? "",
    fromName: saved.fromName || process.env.SES_FROM_NAME?.trim() || "OneFlow",
    appUrl: (saved.appUrl || (
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    )).replace(/\/$/, ""),
    hasCredentials: Boolean(accessKey && secretKey),
    recipientMap: saved.recipientMap ?? {},
  };
}

/** Mask real emails for Admin UI: j***@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (!local) return `***@${domain}`;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function resolveMappedRecipient(
  mockAddress: string,
  map: Record<string, string> = {}
): { mapped: string | null; missing: boolean } {
  let key = mockAddress.trim().toLowerCase();
  // Backward-compatible alias: administration@ → admin@
  if (key === LEGACY_ADMINISTRATION) key = ADMIN_MOCK;
  const mapped = map[key] || null;
  return { mapped, missing: !mapped };
}
