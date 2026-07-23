"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function OneFlowOverviewPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { store, service, ready, resetToSeed, setAutomationMode, refresh } = useData();

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const stats = ready
    ? service.getDashboardStats()
    : {
        newHires: 0,
        openCases: 0,
        completedTasks: 0,
        overdueTasks: 0,
        avgProgress: 0,
      };

  const cases = store.onboardingCases.slice(0, 5).map((c) => ({
    case: c,
    employee: store.employees.find((e) => e.id === c.employeeId),
  }));
  const mode = store.settings?.automationMode ?? "simulation";
  const unread = (store.mockEmails ?? []).filter((e) => e.status === "Unread")
    .length;

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Overview">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Overview"
      subtitle="Onboarding operations dashboard"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-flow-line bg-white px-4 py-3 text-sm shadow-sm">
        <div>
          <p className="font-semibold">Automation mode</p>
          <p className="text-xs text-slate-500">
            Simulation builds the Power Automate payload locally. Live mode is
            prepared for Phase 2 (no secrets / no fake API calls).
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-flow-line p-0.5">
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              mode === "simulation"
                ? "bg-flow-accent text-white"
                : "text-slate-600"
            }`}
            onClick={() => setAutomationMode("simulation")}
          >
            Simulation
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              mode === "live" ? "bg-flow-accent text-white" : "text-slate-600"
            }`}
            onClick={() => setAutomationMode("live")}
          >
            Live
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "New hires", value: stats.newHires },
          { label: "Open cases", value: stats.openCases },
          { label: "Completed tasks", value: stats.completedTasks },
          { label: "Overdue tasks", value: stats.overdueTasks },
          { label: "Unread emails", value: unread },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const open = store.tasks.filter(
          (t) => t.status !== "Completed" && t.status !== "Cancelled"
        );
        const attention = [
          {
            label: "Overdue",
            items: open.filter(
              (t) =>
                t.status === "Overdue" ||
                (t.dueDate < today && t.status !== "Blocked")
            ),
          },
          {
            label: "Escalated",
            items: open.filter((t) => t.escalationStatus === "Escalated"),
          },
          {
            label: "Due Today",
            items: open.filter((t) => t.dueDate === today),
          },
          {
            label: "Returned for Correction",
            items: open.filter((t) => t.outcome === "Returned for Correction"),
          },
          {
            label: "Blocked unexpectedly",
            items: open.filter(
              (t) => t.status === "Blocked" && Boolean(t.blockedReason)
            ),
          },
        ]
          .map((g) => ({
            ...g,
            sample: g.items[0],
            count: g.items.length,
          }))
          .filter((g) => g.count > 0)
          .slice(0, 5);

        return (
          <div className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Work Requiring Attention</h2>
              <Link
                href="/oneflow/my-tasks"
                className="text-xs font-semibold text-flow-accent underline"
              >
                View My Tasks
              </Link>
            </div>
            {attention.length === 0 ? (
              <p className="text-sm text-slate-400">No items needing attention.</p>
            ) : (
              <ul className="space-y-2">
                {attention.map((g) => (
                  <li
                    key={g.label}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{g.label}</p>
                      <p className="text-xs text-slate-500">
                        {g.sample?.title || "—"}
                        {g.count > 1 ? ` · +${g.count - 1} more` : ""}
                      </p>
                    </div>
                    <StatusChip status={String(g.count)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Recent onboarding cases</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/oneflow/automation-runs"
            className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            Run Mock Automation
          </Link>
          <Link
            href="/oneflow/new-hires"
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
          >
            View new hires
          </Link>
          <Link
            href="/oneflow/inbox"
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Mock Inbox
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!session) return;
              const result = service.runReminderCheck(session);
              alert(result.ok ? result.message : result.error);
              refresh();
            }}
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Run Reminder Check
          </button>
          <button
            type="button"
            onClick={() => {
              const resetTemplates = confirm(
                "Reset checklist templates to the default 14 tasks and clear template audit history?\n\nClick Cancel to keep current templates."
              );
              const preserveCases = confirm(
                "Preserve existing onboarding cases, tasks, emails, and automation runs?\n\nOK = preserve cases\nCancel = clear all demo cases"
              );
              if (
                confirm(
                  `Confirm reset demo data?\n\n• Templates: ${
                    resetTemplates ? "restore defaults" : "keep current"
                  }\n• Cases: ${
                    preserveCases ? "preserve" : "clear"
                  }\n\nEmployees will be restored to sample seed.`
                )
              ) {
                resetToSeed({ resetTemplates, preserveCases });
              }
            }}
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Reset demo data
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map(({ case: c, employee }) => (
              <tr key={c.id} className="border-t border-flow-line">
                <td className="px-4 py-3">
                  <Link
                    href={`/oneflow/cases/${c.id}`}
                    className="font-semibold text-flow-accent hover:underline"
                  >
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {employee?.fullName ?? "—"}
                  <p className="text-xs text-slate-400">
                    {employee?.department}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {employee ? formatDate(employee.startDate) : "—"}
                </td>
                <td className="w-40 px-4 py-3">
                  <div className="mb-1 text-xs tabular-nums">
                    {c.overallProgress}%
                  </div>
                  <ProgressBar value={c.overallProgress} tone="blue" />
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={c.status} />
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={5}>
                  No onboarding cases yet. In PPG Workday, create a worker with
                  status <strong>New Hire</strong>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
