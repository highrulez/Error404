/**
 * Unit tests for SES recipient mapping and email config (no AWS network calls).
 * Run: npx tsx src/server/email/config.test.ts
 */

import assert from "node:assert/strict";
import { maskEmail, resolveMappedRecipient } from "./config";

function testAdministrationAliasResolve() {
  const { mapped, missing } = resolveMappedRecipient(
    "administration@ppg-demo.com",
    { "admin@ppg-demo.com": "real-admin@example.com" }
  );
  assert.equal(missing, false);
  assert.equal(mapped, "real-admin@example.com");
}

function testMissingMapping() {
  const { mapped, missing } = resolveMappedRecipient("unknown@ppg-demo.com", {});
  assert.equal(mapped, null);
  assert.equal(missing, true);
}

function testMaskEmail() {
  assert.equal(maskEmail("jane.doe@example.com"), "j***@example.com");
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
}

testAdministrationAliasResolve();
testMissingMapping();
testMaskEmail();
console.log("email config tests passed");
