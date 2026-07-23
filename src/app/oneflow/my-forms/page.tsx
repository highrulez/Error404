"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { inductionFormProgress } from "@/data/induction-seed";
import { accessCardFormProgress } from "@/data/access-card-types";

function primaryActionLabel(status: string): string {
  if (["Sent", "Opened"].includes(status)) return "Start Form";
  if (status === "Draft") return "Continue Form";
  if (status === "Submitted") return "View Submitted Form";
  if (
    status === "Under HR Review" ||
    status === "Under Administration Review" ||
    status === "Approved"
  ) {
    return "View Review Status";
  }
  if (status === "Returned for Correction") return "Correct Form";
  if (["Completed", "Card Issued", "Fully Cleared"].includes(status)) {
    return "View Completed Form";
  }
  return "Open Form";
}

function recipientAfterSubmit(kind: string): string {
  if (kind === "Induction Checklist") return "hr@ppg-demo.com";
  if (kind === "Access Card Application") return "administration@ppg-demo.com";
  if (kind === "Exit Clearance") return "Department reviewers";
  return "—";
}

export default function MyFormsPage() {
  const { session } = useAuth();
  const { ready, service, store } = useData();
  if (!session) return null;

  const forms = ready ? service.listMyForms(session) : [];

  return (
    <OneFlowShell title="My Forms" subtitle="Forms assigned to you">
      <div className="space-y-3">
        {forms.map((f) => {
          let progress = 0;
          if (f.kind === "Induction Checklist") {
            const full = store.inductionForms.find((x) => x.id === f.id);
            progress = full ? inductionFormProgress(full) : 0;
          } else if (f.kind === "Access Card Application") {
            const full = store.accessCardForms.find((x) => x.id === f.id);
            progress = full ? accessCardFormProgress(full) : 0;
          } else if (f.kind === "Exit Clearance") {
            progress = service.getExitFormProgress(f.id).percent;
          }
          const action = primaryActionLabel(f.status);
          return (
            <div
              key={`${f.kind}-${f.id}`}
              className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{f.formName}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <StatusChip status={f.status} />
                    <StatusChip status={f.lifecycle} />
                  </div>
                </div>
                <Link
                  href={f.href}
                  className="rounded-md bg-flow-accent px-3 py-2 text-sm font-semibold text-white"
                >
                  {action}
                </Link>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Due</dt>
                  <dd>{f.dueDate ? formatDate(f.dueDate) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Last updated</dt>
                  <dd>{formatDate(f.updatedAt.slice(0, 10))}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Recipient after submission</dt>
                  <dd>{recipientAfterSubmit(f.kind)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Reviewer</dt>
                  <dd>{f.reviewer || "—"}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <p className="mb-1 text-[11px] text-slate-400">Progress</p>
                <ProgressBar value={progress} tone="blue" />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link href={f.href} className="text-flow-accent underline">
                  {action}
                </Link>
                {f.kind === "Induction Checklist" && (
                  <Link
                    href={`/oneflow/my-forms/induction/${f.id}/preview?mode=draft`}
                    className="text-slate-500 underline"
                  >
                    Preview
                  </Link>
                )}
                {f.kind === "Access Card Application" && (
                  <Link
                    href={`/oneflow/my-forms/access-card/${f.id}/preview?mode=draft`}
                    className="text-slate-500 underline"
                  >
                    Preview
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {ready && forms.length === 0 && (
        <div className="rounded-xl border border-flow-line bg-white p-8 text-center text-sm text-slate-400">
          No forms assigned.
        </div>
      )}
      {session.role === "Admin" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950"
            onClick={() => {
              const r = service.repairAliciaOnboardingForms(session);
              if (!r.ok) window.alert(r.error);
              else window.alert(`Repair complete. ${r.message}`);
              window.location.reload();
            }}
          >
            Repair Alicia Onboarding Forms
          </button>
        </div>
      )}
    </OneFlowShell>
  );
}
