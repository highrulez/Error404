/**
 * Mock email domain helpers.
 *
 * Migration-history: earlier prototypes used @oneflow.local mailboxes.
 * All live seed/demo data now uses @ppg-demo.com only.
 */

const OLD_DOMAIN_SUFFIX = "@oneflow.local";
const NEW_DOMAIN = "@ppg-demo.com";

/** Local-part renames applied after domain migration. */
const LOCAL_PART_RENAMES: Record<string, string> = {
  "security@ppg-demo.com": "itsecurity@ppg-demo.com",
  // guard against accidental double-prefix from older migrations
  "ititsecurity@ppg-demo.com": "itsecurity@ppg-demo.com",
};

export function migrateEmailAddress(email: string): string {
  if (!email || typeof email !== "string") return email;
  let next = email.trim();
  const at = next.lastIndexOf("@");
  if (at >= 0) {
    const domain = next.slice(at).toLowerCase();
    if (domain === OLD_DOMAIN_SUFFIX) {
      next = `${next.slice(0, at)}${NEW_DOMAIN}`;
    }
  }
  const renamed = LOCAL_PART_RENAMES[next.toLowerCase()];
  return renamed ?? next;
}

export function migrateEmailList(emails: string[] | undefined | null): string[] {
  if (!emails?.length) return emails ? [...emails] : [];
  return emails.map(migrateEmailAddress);
}

function rewriteEmailsInText(text: string): string {
  let next = text;
  if (next.toLowerCase().includes(OLD_DOMAIN_SUFFIX)) {
    next = next.replace(/@oneflow\.local/gi, NEW_DOMAIN);
  }
  // Whole-address only — do not match inside "itsecurity@..."
  next = next.replace(
    /(?<![A-Za-z0-9._%+-])security@ppg-demo\.com/gi,
    "itsecurity@ppg-demo.com"
  );
  next = next.replace(
    /(?<![A-Za-z0-9._%+-])ititsecurity@ppg-demo\.com/gi,
    "itsecurity@ppg-demo.com"
  );
  return next;
}

/** Deep-replace email-like string values that still use the old domain (or renamed locals). */
export function migrateEmailsInUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    const rewritten = rewriteEmailsInText(value);
    if (!rewritten.includes(" ") && rewritten.includes("@")) {
      return migrateEmailAddress(rewritten);
    }
    return rewritten;
  }
  if (Array.isArray(value)) {
    return value.map(migrateEmailsInUnknown);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = migrateEmailsInUnknown(v);
    }
    return out;
  }
  return value;
}

export function emailNeedsMigration(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.endsWith(OLD_DOMAIN_SUFFIX) ||
    lower === "security@ppg-demo.com" ||
    lower === "ititsecurity@ppg-demo.com" ||
    lower.includes(OLD_DOMAIN_SUFFIX)
  );
}

export function storeNeedsEmailMigration(raw: unknown): boolean {
  try {
    const text = JSON.stringify(raw);
    return (
      text.toLowerCase().includes(OLD_DOMAIN_SUFFIX) ||
      /(?<![A-Za-z0-9._%+-])security@ppg-demo\.com/i.test(text) ||
      /ititsecurity@ppg-demo\.com/i.test(text)
    );
  } catch {
    return false;
  }
}
