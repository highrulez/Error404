import { NextResponse } from "next/server";
import { deliverWorkflowEmail } from "@/server/email/workflow-email-service";
import { escapeHtml, wrapEmailDocument } from "@/server/email/html";

export const runtime = "nodejs";

/**
 * Admin-only SES connectivity test.
 * Sends to the mapped address for a chosen @ppg-demo.com identity.
 */
export async function POST(request: Request) {
  let body: {
    toMock?: string;
    session?: { email?: string; role?: string; name?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const toMock = (body.toMock || "admin@ppg-demo.com").trim().toLowerCase();
  const result = await deliverWorkflowEmail({
    action: "sendTestSesEmail",
    toMock,
    subject: "OneFlow SES Test Email",
    htmlBody: wrapEmailDocument(
      `<p>This is a OneFlow prototype SES connectivity test.</p><p>Simulated recipient: <strong>${escapeHtml(toMock)}</strong></p>`
    ),
    notificationId: `test-${Date.now()}`,
    notificationType: "SES Test",
    sourceType: "Manual",
    sourceRecordId: `ses-test-${Date.now()}`,
    session: {
      email: String(body.session?.email || ""),
      role: String(body.session?.role || ""),
      name: body.session?.name,
    },
    forceResend: true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
