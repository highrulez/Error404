"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { formatDateTime } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function AutomationRunsPage() {
  const { session } = useAuth();
  const { store, service, refresh, ready } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const runs = store.automationRuns ?? [];
  const selected = runs.find((r) => r.id === selectedId) ?? runs[0];

  const cases = useMemo(
    () =>
      store.onboardingCases.map((c) => ({
        case: c,
        employee: store.employees.find((e) => e.id === c.employeeId),
      })),
    [store]
  );

  if (!session) return null;
  if (session.role !== "Admin") {
    return (
      <OneFlowShell title="Automation Runs">
        <p className="text-sm text-rose-600">Admin access required.</p>
      </OneFlowShell>
    );
  }

  const runForCase = async (caseId: string, simulateFailure: boolean) => {
    setBusy(true);
    setToast(null);
    const result = await service.runMockAutomation(caseId, { simulateFailure });
    setToast(result.message);
    refresh();
    if (result.runId) setSelectedId(result.runId);
    setBusy(false);
  };

  return (
    <OneFlowShell
      title="Automation Runs"
      subtitle="Local Mock Power Automate history"
    >
      {toast && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            toast.toLowerCase().includes("fail")
              ? "bg-rose-50 text-rose-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Run Mock Automation</p>
            <p className="mt-1 text-xs text-slate-500">
              Select an onboarding case, then run success or failure simulation (~1.5s).
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            onClick={() => {
              setBusy(true);
              setToast(null);
              const result = service.runReminderCheck(session);
              setToast(result.ok ? result.message : result.error);
              refresh();
              setBusy(false);
            }}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Run Reminder Check
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {cases.map(({ case: c, employee }) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-flow-line px-3 py-2 text-xs"
            >
              <span className="font-semibold">
                {c.caseNumber} · {employee?.fullName}
              </span>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-flow-accent px-2 py-1 font-semibold text-white disabled:opacity-50"
                onClick={() => runForCase(c.id, false)}
              >
                {busy ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  "Run Mock Automation"
                )}
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded border border-rose-300 px-2 py-1 font-semibold text-rose-700 disabled:opacity-50"
                onClick={() => runForCase(c.id, true)}
              >
                Simulate Failure
              </button>
            </div>
          ))}
          {cases.length === 0 && (
            <p className="text-xs text-slate-400">
              No onboarding cases. Create a New Hire in PPG Workday first.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Run</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const emp = store.employees.find((e) => e.id === r.employeeId);
                return (
                  <tr
                    key={r.id}
                    className={`cursor-pointer border-t border-flow-line hover:bg-slate-50 ${
                      selected?.id === r.id ? "bg-sky-50" : ""
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td className="px-3 py-2">
                      <p className="font-semibold">{r.runNumber}</p>
                      <p className="text-[10px] text-slate-400">{r.trigger}</p>
                    </td>
                    <td className="px-3 py-2">{emp?.fullName ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.durationMs != null
                        ? `${(r.durationMs / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {ready && runs.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-slate-400" colSpan={4}>
                    No automation runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{selected.runNumber}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(selected.startedAt)}
                    {selected.endedAt
                      ? ` → ${formatDateTime(selected.endedAt)}`
                      : ""}
                  </p>
                </div>
                <StatusChip status={selected.status} />
              </div>
              <p className="text-sm">
                Tasks assigned: <strong>{selected.tasksAssigned}</strong> ·
                Emails: <strong>{selected.emailsGenerated}</strong>
              </p>
              {selected.errorMessage && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {selected.errorMessage}
                </p>
              )}
              {selected.status === "Failed" && (
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={async () => {
                    setBusy(true);
                    const result = await service.retryAutomationRun(selected.id);
                    setToast(result.message);
                    refresh();
                    setBusy(false);
                  }}
                >
                  Retry Automation
                </button>
              )}
              <div>
                <p className="mb-2 text-sm font-semibold">Step history</p>
                <ol className="space-y-2">
                  {selected.steps.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-md border border-flow-line px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {s.order}. {s.name}
                        </span>
                        <StatusChip status={s.status} />
                      </div>
                      {s.detail && (
                        <p className="mt-1 text-slate-500">{s.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <Link
                href={`/oneflow/cases/${selected.onboardingCaseId}`}
                className="inline-block text-sm font-semibold text-flow-accent hover:underline"
              >
                Open onboarding case →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a run for details.</p>
          )}
        </div>
      </div>
    </OneFlowShell>
  );
}
