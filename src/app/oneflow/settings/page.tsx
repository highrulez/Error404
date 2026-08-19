"use client";

import { useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";

const SECTIONS = [
  { title: "Workflow Configuration", description: "Maintain the task and clearance templates used by lifecycle cases.", links: [["/oneflow/checklist-templates", "Checklist Template Management"], ["/oneflow/exit-clearance-templates", "Exit Clearance Templates"]] },
  { title: "Communication", description: "Review prototype notifications and delivery configuration.", links: [["/oneflow/inbox", "Mock Inbox"], ["/oneflow/email-delivery", "Email Delivery"]] },
  { title: "Automation & Demo", description: "Inspect simulation runs and offboarding demo controls.", links: [["/oneflow/automation-runs", "Mock Automation History"], ["/oneflow/offboarding", "Offboarding / Demo Controls"]] },
] as const;

export default function SettingsPage() {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const [message, setMessage] = useState<string | null>(null);
  if (!session) return null;
  if (session.role !== "Admin") return <OneFlowShell title="Settings"><p className="text-sm text-slate-500">Admin only.</p></OneFlowShell>;
  return <OneFlowShell title="Settings" subtitle="Workflow configuration, communications and demo controls">
    {message && <div className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">{message}</div>}
    <div className="space-y-6">{SECTIONS.map((section) => <section key={section.title}><h2 className="text-base font-semibold">{section.title}</h2><p className="mt-1 text-sm text-slate-500">{section.description}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{section.links.map(([href, label]) => <Link key={href} href={href} className="rounded-2xl border border-flow-line bg-white px-4 py-4 text-sm font-semibold shadow-sm transition hover:border-flow-accent hover:shadow-md">{label}{label === "Email Delivery" && <span className="mt-1 block text-xs font-normal text-slate-500">Prototype provider: AWS SES · Production direction: Microsoft 365 / Outlook</span>}</Link>)}</div></section>)}</div>
    <section className="mt-7 rounded-2xl border border-flow-line bg-white p-5 shadow-sm"><h2 className="text-base font-semibold">Administration</h2><p className="mt-1 text-sm text-slate-500">Repair prototype records or reset a demo journey when needed.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className="rounded-xl border border-flow-line bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => { const result = service.repairExitConfirmationLinks(session); if (!result.ok) setMessage(result.error); else { setMessage(`Repair complete · items ${result.repairedItems}, tasks ${result.createdTasks}, warnings ${result.warnings}`); refresh(); } }}>Repair Exit Confirmation Links</button><button type="button" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" onClick={() => { const result = service.resetDanielExitFormJourney(session); setMessage(result.ok ? "Hamdan Exit Form Journey reset." : result.error); if (result.ok) refresh(); }}>Reset Hamdan Exit Form Journey</button><button type="button" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900" onClick={() => { if (!confirm("Reset all demo data to seed?")) return; service.resetToSeed(); setMessage("Demo data reset to seed."); refresh(); }}>Reset Demo Data</button></div></section>
  </OneFlowShell>;
}
