import { NextResponse } from "next/server";
import {
  deliverWorkflowEmail,
  type WorkflowEmailRequest,
} from "@/server/email/workflow-email-service";
import type { WorkflowEmailAction } from "@/data/auth-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Partial<WorkflowEmailRequest>;
  try {
    body = (await request.json()) as Partial<WorkflowEmailRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.action || !body.toMock || !body.subject || !body.notificationId || !body.session) {
    return NextResponse.json(
      { ok: false, error: "Missing required workflow email fields." },
      { status: 400 }
    );
  }

  // Reject any attempt to pass a raw real recipient field
  if ("toReal" in body || "realRecipient" in body || "destination" in body) {
    return NextResponse.json(
      { ok: false, error: "Arbitrary recipients are not allowed." },
      { status: 400 }
    );
  }

  const result = await deliverWorkflowEmail({
    action: body.action as WorkflowEmailAction,
    toMock: String(body.toMock),
    ccMock: body.ccMock,
    subject: String(body.subject),
    htmlBody: String(body.htmlBody || ""),
    notificationId: String(body.notificationId),
    notificationType: String(body.notificationType || body.action),
    sourceType: body.sourceType,
    sourceRecordId: body.sourceRecordId,
    attachments: body.attachments,
    openFormPath: body.openFormPath,
    openFormLabel: body.openFormLabel,
    session: {
      email: String(body.session.email || ""),
      role: String(body.session.role || ""),
      name: body.session.name,
    },
    forceResend: Boolean(body.forceResend),
    previousProviderMessageId: body.previousProviderMessageId,
    previousDeliveryStatus: body.previousDeliveryStatus,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
