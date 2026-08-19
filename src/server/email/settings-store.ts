import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EmailMode } from "./config";

export type SavedEmailSettings = {
  mode?: EmailMode;
  region?: string;
  fromEmail?: string;
  fromName?: string;
  appUrl?: string;
  recipientMap?: Record<string, string>;
  updatedAt?: string;
};

const filePath = join(process.cwd(), ".oneflow-email-settings.json");

export function readSavedEmailSettings(): SavedEmailSettings {
  try {
    if (!existsSync(filePath)) return {};
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as SavedEmailSettings;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function saveEmailSettings(patch: SavedEmailSettings): SavedEmailSettings {
  const next = { ...readSavedEmailSettings(), ...patch, updatedAt: new Date().toISOString() };
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  writeFileSync(temporary, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, filePath);
  return next;
}
