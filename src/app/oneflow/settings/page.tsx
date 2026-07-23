"use client";

import { useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";

export default function SettingsPage() {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return null;
  if (session.role !== "Admin") {
    return (
      <OneFlowShell title="Settings">
        <p className="text-sm text-slate-500">Admin only.</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell title="Settings" subtitle="Templates, automation, and demo controls">
      {message && (
        <div className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">{message}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/oneflow/checklist-templates", label: "Checklist Template Management" },
          { href: "/oneflow/exit-clearance-templates", label: "Exit Clearance Templates" },
          { href: "/oneflow/inbox", label: "Mock Inbox" },
          { href: "/oneflow/automation-runs", label: "Mock Automation History" },
          { href: "/oneflow/offboarding", label: "Offboarding / Demo Controls" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-flow-line bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:border-flow-accent"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Admin actions</h2>
        <button
          type="button"
          className="rounded-md border border-flow-line px-3 py-2 text-sm font-semibold"
          onClick={() => {
            const r = service.repairExitConfirmationLinks(session);
            if (!r.ok) setMessage(r.error);
            else {
              setMessage(
                `Repair complete · items ${r.repairedItems}, tasks ${r.createdTasks}, warnings ${r.warnings}`
              );
              refresh();
            }
          }}
        >
          Repair Exit Confirmation Links
        </button>
        <button
          type="button"
          className="ml-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
          onClick={() => {
            const r = service.resetDanielExitFormJourney(session);
            if (!r.ok) setMessage(r.error);
            else {
              setMessage("Daniel Exit Form Journey reset.");
              refresh();
            }
          }}
        >
          Reset Daniel Exit Form Journey
        </button>
        <button
          type="button"
          className="ml-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900"
          onClick={() => {
            service.resetToSeed();
            setMessage("Demo data reset to seed.");
            refresh();
          }}
        >
          Reset Demo Data
        </button>
      </div>
    </OneFlowShell>
  );
}
