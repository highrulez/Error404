import { NextResponse } from "next/server";
import { getEmailServerConfig } from "@/server/email/config";
import { saveEmailSettings } from "@/server/email/settings-store";

export const runtime = "nodejs";

const RECIPIENTS = ["admin@ppg-demo.com", "sherry.soh@ppg-demo.com", "manager@ppg-demo.com", "amirul.azli@ppg-demo.com", "nuqman.zulfikar@ppg-demo.com", "facilities@ppg-demo.com", "noorliana.bashari@ppg-demo.com", "nabila.aziz@ppg-demo.com", "muhamad.asyraf.hamdan@ppg-demo.com"];

function isAdmin(session: unknown): boolean {
  const value = session as { role?: string; email?: string } | undefined;
  return value?.role === "Admin" && value.email?.toLowerCase() === "admin@ppg-demo.com";
}

function settingsPayload() {
  const cfg = getEmailServerConfig();
  return { mode: cfg.mode, region: cfg.region, fromEmail: cfg.fromEmail, fromName: cfg.fromName, appUrl: cfg.appUrl, credentialsConfigured: cfg.hasCredentials, credentialsMessage: "Credentials are managed server-side", mappings: RECIPIENTS.map((simulated) => ({ simulated, destination: cfg.recipientMap[simulated] || "", configured: Boolean(cfg.recipientMap[simulated]) })) };
}

export async function POST(request: Request) {
  let body: { action?: string; session?: unknown; settings?: Record<string, unknown> };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  if (!isAdmin(body.session)) return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
  if (body.action === "get") return NextResponse.json({ ok: true, settings: settingsPayload() });
  if (body.action !== "save") return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  const input = body.settings || {}; const mode = input.mode;
  if (mode !== "mock" && mode !== "ses" && mode !== "both") return NextResponse.json({ ok: false, error: "Invalid delivery mode." }, { status: 400 });
  const text = (key: string, fallback = "") => typeof input[key] === "string" ? input[key]!.trim() : fallback;
  const region = text("region"); const fromEmail = text("fromEmail"); const fromName = text("fromName"); const appUrl = text("appUrl").replace(/\/$/, "");
  if (!region || !fromName || !appUrl || !/^https?:\/\//.test(appUrl) || (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail))) return NextResponse.json({ ok: false, error: "Enter a valid region, sender name, sender email (if set), and http(s) application URL." }, { status: 400 });
  const rawMap = input.recipientMap as Record<string, unknown> | undefined; const recipientMap: Record<string, string> = {};
  for (const simulated of RECIPIENTS) { const destination = typeof rawMap?.[simulated] === "string" ? rawMap[simulated].trim() : ""; if (destination) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) return NextResponse.json({ ok: false, error: `Invalid destination for ${simulated}.` }, { status: 400 }); recipientMap[simulated] = destination; } }
  try {
    saveEmailSettings({ mode, region, fromEmail, fromName, appUrl, recipientMap });
  } catch (error) {
    const detail = error instanceof Error ? { name: error.name, message: error.message } : {};
    console.error("[Email settings] Failed to persist settings.", detail);
    return NextResponse.json({ ok: false, error: "Email settings could not be saved. Check the server data-directory permissions." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "Email settings and recipient mappings updated.", settings: settingsPayload() });
}
