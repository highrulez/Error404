/**
 * Workflow email authorization / allowlist tests (no SES network).
 * Run: npx tsx src/server/email/workflow-email-service.test.ts
 */

import assert from "node:assert/strict";

// Isolate env before importing service
process.env.EMAIL_MODE = "mock";
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

async function main() {
  const { deliverWorkflowEmail } = await import("./workflow-email-service");

  const employeeBlocked = await deliverWorkflowEmail({
    action: "sendTaskReminderEmail",
    toMock: "hr@ppg-demo.com",
    subject: "Test",
    htmlBody: "<p>Hi</p>",
    notificationId: "n1",
    notificationType: "Reminder",
    session: {
      email: "alicia.wong@ppg-demo.com",
      role: "ONBOARDING_EMPLOYEE",
      name: "Alicia Wong",
    },
  });
  assert.equal(employeeBlocked.ok, false);
  assert.match(employeeBlocked.error || "", /cannot trigger/i);

  const mockMode = await deliverWorkflowEmail({
    action: "sendTaskReminderEmail",
    toMock: "hr@ppg-demo.com",
    subject: "Reminder",
    htmlBody: "<p>Please complete your task</p>",
    notificationId: "n2",
    notificationType: "Task Reminder",
    sourceRecordId: "task-1",
    session: { email: "admin@ppg-demo.com", role: "Admin", name: "Admin" },
  });
  assert.equal(mockMode.ok, true);
  assert.equal(mockMode.deliveryStatus, "Mock Only");
  assert.equal(mockMode.provider, "mock");

  const badRecipient = await deliverWorkflowEmail({
    action: "sendEscalationEmail",
    toMock: "attacker@evil.com",
    subject: "Nope",
    htmlBody: "<p>x</p>",
    notificationId: "n3",
    notificationType: "Escalation",
    session: { email: "admin@ppg-demo.com", role: "Admin" },
  });
  assert.equal(badRecipient.ok, false);
  assert.match(badRecipient.error || "", /ppg-demo/);

  // Duplicate within window
  const first = await deliverWorkflowEmail({
    action: "sendLaptopDecisionEmail",
    toMock: "manager@ppg-demo.com",
    subject: "Laptop",
    htmlBody: "<p>Decide</p>",
    notificationId: "n4",
    notificationType: "Laptop Manager Decision",
    sourceRecordId: "laptop-1",
    session: { email: "admin@ppg-demo.com", role: "Admin" },
  });
  assert.equal(first.ok, true);
  const dup = await deliverWorkflowEmail({
    action: "sendLaptopDecisionEmail",
    toMock: "manager@ppg-demo.com",
    subject: "Laptop",
    htmlBody: "<p>Decide</p>",
    notificationId: "n5",
    notificationType: "Laptop Manager Decision",
    sourceRecordId: "laptop-1",
    session: { email: "admin@ppg-demo.com", role: "Admin" },
  });
  assert.equal(dup.skippedDuplicate, true);

  console.log("workflow email service tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
