/**
 * File-backed settings persistence test (no Docker or AWS network).
 * Run: npx tsx src/server/email/settings-store.test.ts
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const originalCwd = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), "oneflow-email-settings-"));

  try {
    process.chdir(directory);
    Object.assign(process.env, { NODE_ENV: "production" });
    const { readSavedEmailSettings, saveEmailSettings } = await import("./settings-store");
    const saved = saveEmailSettings({
      mode: "mock",
      region: "ap-southeast-1",
      fromEmail: "",
      fromName: "OneFlow",
      appUrl: "https://oneflow.highrulez.com",
      recipientMap: { "admin@ppg-demo.com": "admin@example.com" },
    });

    const path = join(directory, "data", "email-settings.json");
    assert.equal(existsSync(path), true);
    assert.equal(existsSync(`${path}.tmp`), false);
    assert.equal(readSavedEmailSettings().recipientMap?.["admin@ppg-demo.com"], "admin@example.com");
    assert.equal(JSON.parse(readFileSync(path, "utf8")).updatedAt, saved.updatedAt);
  } finally {
    process.chdir(originalCwd);
    rmSync(directory, { recursive: true, force: true });
  }

  console.log("email settings persistence test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
