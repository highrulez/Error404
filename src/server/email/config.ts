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

/** Friendly EMAIL_MAP_* keys → canonical mock @ppg-demo.com addresses. */
const EMAIL_MAP_ALIASES: Record<string, string> = {
  admin: "admin@ppg-demo.com",
  administration: "admin@ppg-demo.com",
  sherry: "sherry.soh@ppg-demo.com",
  "sherry.soh": "sherry.soh@ppg-demo.com",
  amirul: "amirul.azli@ppg-demo.com",
  "amirul.azli": "amirul.azli@ppg-demo.com",
  nuqman: "nuqman.zulfikar@ppg-demo.com",
  "nuqman.zulfikar": "nuqman.zulfikar@ppg-demo.com",
  noorliana: "noorliana.bashari@ppg-demo.com",
  "noorliana.bashari": "noorliana.bashari@ppg-demo.com",
  nabila: "nabila.aziz@ppg-demo.com",
  "nabila.aziz": "nabila.aziz@ppg-demo.com",
  hamdan: "muhamad.asyraf.hamdan@ppg-demo.com",
  "muhamad.asyraf.hamdan": "muhamad.asyraf.hamdan@ppg-demo.com",
};

const LEGACY_ADMINISTRATION = "administration@ppg-demo.com";
const ADMIN_MOCK = "admin@ppg-demo.com";

function readMode(): EmailMode {
  const raw = (process.env.EMAIL_MODE || "mock").trim().toLowerCase();
  if (raw === "ses" || raw === "both") return raw;
  return "mock";
}

function canonicalizeMockKey(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  if (key === LEGACY_ADMINISTRATION) return ADMIN_MOCK;
  if (key.includes("@")) return key === LEGACY_ADMINISTRATION ? ADMIN_MOCK : key;
  return EMAIL_MAP_ALIASES[key] || `${key}@ppg-demo.com`;
}

/**
 * Parse EMAIL_RECIPIENT_MAP JSON or EMAIL_MAP_<localpart> env vars.
 * Keys are mock @ppg-demo.com addresses (lowercase).
 * Supports EMAIL_MAP_ADMIN, EMAIL_MAP_NABILA, EMAIL_MAP_HAMDAN aliases.
 * Legacy administration@ entries are folded into admin@.
 */
export function parseRecipientMap(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const map: Record<string, string> = {};

  const json = env.EMAIL_RECIPIENT_MAP?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.includes("@")) {
          map[canonicalizeMockKey(k)] = v.trim();
        }
      }
    } catch {
      // ignore invalid JSON; fall through to EMAIL_MAP_* keys
    }
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("EMAIL_MAP_") || !value) continue;
    const local = key.slice("EMAIL_MAP_".length).toLowerCase();
    if (!local) continue;
    map[canonicalizeMockKey(local)] = value.trim();
  }

  // Never expose administration@ as a separate mapped identity
  if (map[LEGACY_ADMINISTRATION] && !map[ADMIN_MOCK]) {
    map[ADMIN_MOCK] = map[LEGACY_ADMINISTRATION];
  }
  delete map[LEGACY_ADMINISTRATION];

  return map;
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
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
    )).replace(/\/$/, ""),
    hasCredentials: Boolean(accessKey && secretKey),
    recipientMap: saved.recipientMap || parseRecipientMap(),
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
  map: Record<string, string> = parseRecipientMap()
): { mapped: string | null; missing: boolean } {
  let key = mockAddress.trim().toLowerCase();
  // Backward-compatible alias: administration@ → admin@
  if (key === LEGACY_ADMINISTRATION) key = ADMIN_MOCK;
  const mapped = map[key] || null;
  return { mapped, missing: !mapped };
}
