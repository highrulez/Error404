/**
 * Unit tests for SES recipient mapping and email config (no AWS network calls).
 * Run: npx tsx src/server/email/config.test.ts
 */

import assert from "node:assert/strict";
import {
  maskEmail,
  parseRecipientMap,
  resolveMappedRecipient,
} from "./config";

function testParseRecipientMapJson() {
  const map = parseRecipientMap({
    EMAIL_RECIPIENT_MAP: JSON.stringify({
      "manager@ppg-demo.com": "real.manager@example.com",
      "hr@ppg-demo.com": "real.hr@example.com",
    }),
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(map["manager@ppg-demo.com"], "real.manager@example.com");
  assert.equal(map["hr@ppg-demo.com"], "real.hr@example.com");
}

function testParseRecipientMapEnvKeys() {
  const map = parseRecipientMap({
    EMAIL_MAP_admin: "admin.real@example.com",
    EMAIL_MAP_manager: "mgr@example.com",
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(map["admin@ppg-demo.com"], "admin.real@example.com");
  assert.equal(map["manager@ppg-demo.com"], "mgr@example.com");
}

function testFriendlyAliases() {
  const map = parseRecipientMap({
    EMAIL_MAP_ADMIN: "a@x.com",
    EMAIL_MAP_ALICIA: "onboard@x.com",
    EMAIL_MAP_DANIEL: "offboard@x.com",
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(map["admin@ppg-demo.com"], "a@x.com");
  assert.equal(map["alicia.wong@ppg-demo.com"], "onboard@x.com");
  assert.equal(map["daniel.lim@ppg-demo.com"], "offboard@x.com");
  assert.equal(map["administration@ppg-demo.com"], undefined);
}

function testAdministrationAliasResolve() {
  const map = parseRecipientMap({
    EMAIL_RECIPIENT_MAP: JSON.stringify({
      "admin@ppg-demo.com": "real-admin@example.com",
      "administration@ppg-demo.com": "should-fold@example.com",
    }),
  } as unknown as NodeJS.ProcessEnv);
  // Folded into admin@ — last write wins for same canonical key depending on order;
  // administration key must not remain as a separate map entry.
  assert.equal(map["administration@ppg-demo.com"], undefined);
  assert.ok(map["admin@ppg-demo.com"]);
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

function testInvalidJsonFallsBack() {
  const map = parseRecipientMap({
    EMAIL_RECIPIENT_MAP: "{not-json",
    EMAIL_MAP_hr: "hr@x.com",
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(map["hr@ppg-demo.com"], "hr@x.com");
}

testParseRecipientMapJson();
testParseRecipientMapEnvKeys();
testFriendlyAliases();
testAdministrationAliasResolve();
testMissingMapping();
testMaskEmail();
testInvalidJsonFallsBack();
console.log("email config tests passed");
