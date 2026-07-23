import { NextResponse } from "next/server";
import { getPublicEmailSettings } from "@/server/email/workflow-email-service";

export const runtime = "nodejs";

/** Safe public settings — no secrets, masked mappings only. */
export async function GET() {
  return NextResponse.json({ ok: true, settings: getPublicEmailSettings() });
}
