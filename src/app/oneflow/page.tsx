"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { lifecycleReadiness } from "@/components/oneflow/lifecycle-visibility";
import { AlertTriangle, CalendarClock, Mail, UserPlus, UserRoundX } from "lucide-react";
import { RoleDashboard } from "@/components/oneflow/role-dashboard";

export default function OneFlowOverviewPage() {
  const { session } = useAuth();
  const { store, service, ready, resetToSeed, setAutomationMode, refresh } = useData();


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
  const today = new Date().toISOString().slice(0, 10);
  const openTasks = store.tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled"
  );
  const dueSoon = openTasks.filter(
    (t) => t.dueDate >= today && t.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const offboardingCases = store.offboardingCases.map((c) => ({
    case: c,
    employee: store.employees.find((e) => e.id === c.employeeId),
  }));
  const attentionTasks = openTasks
    .filter((t) => t.status === "Overdue" || t.status === "Blocked" || t.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  if (!session) {
    return (
      <OneFlowShell title="Overview">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  if (session.role !== "Admin") {
    return <OneFlowShell title="Dashboard" subtitle="Role priorities and employee journeys"><RoleDashboard /></OneFlowShell>;
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
          { label: "Preboarding", value: store.onboardingCases.filter((c) => c.status !== "Completed").length, icon: UserPlus, tone: "bg-cyan-50 border-cyan-100 text-cyan-700" },
          { label: "Offboarding", value: store.offboardingCases.filter((c) => c.status !== "Completed").length, icon: UserRoundX, tone: "bg-violet-50 border-violet-100 text-violet-700" },
          { label: "Overdue tasks", value: stats.overdueTasks, icon: AlertTriangle, tone: "bg-rose-50 border-rose-100 text-rose-700" },
          { label: "Due this week", value: dueSoon.length, icon: CalendarClock, tone: "bg-indigo-50 border-indigo-100 text-indigo-700" },
          { label: "Unread emails", value: unread, icon: Mail, tone: "bg-sky-50 border-sky-100 text-sky-700" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border p-4 shadow-sm ${s.tone}`}
          >
            <div className="flex items-start justify-between"><p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{s.label}</p><s.icon className="h-4 w-4" /></div>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{s.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">Current lifecycle workload</p>
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

      <div className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Needs Attention</h2><span className="text-xs text-slate-500">Most urgent incomplete work</span></div>
        {attentionTasks.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b border-slate-100 text-slate-500"><tr><th className="pb-2">Employee</th><th className="pb-2">Task</th><th className="pb-2">Responsible role</th><th className="pb-2">Due</th><th className="pb-2">Status</th><th className="pb-2">Lifecycle</th></tr></thead><tbody>{attentionTasks.map((task) => { const employee = store.employees.find((e) => e.id === task.employeeId); const lifecycle = task.offboardingCaseId ? "Offboarding" : "Onboarding"; const href = task.offboardingCaseId ? `/oneflow/offboarding/cases/${task.offboardingCaseId}` : `/oneflow/cases/${task.onboardingCaseId}`; return <tr key={task.id} className="border-b border-slate-100"><td className="py-2">{employee?.fullName ?? "—"}</td><td className="py-2"><Link href={href} className="font-semibold text-flow-accent hover:underline">{task.title}</Link></td><td className="py-2">{task.responsibleTeam}</td><td className="py-2">{formatDate(task.dueDate)}</td><td className="py-2"><StatusChip status={task.dueDate < today && task.status === "Pending" ? "Overdue" : task.status} /></td><td className="py-2">{lifecycle}</td></tr>; })}</tbody></table></div> : <p className="text-sm text-slate-400">No overdue or blocked work.</p>}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold">Upcoming joiners</h2><div className="mt-3 space-y-2">{cases.map(({ case: c, employee }) => <Link key={c.id} href={`/oneflow/cases/${c.id}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs"><span><strong>{employee?.fullName}</strong><br />{formatDate(employee?.startDate ?? "")}</span><span className="font-semibold">{lifecycleReadiness(store.tasks.filter((t) => t.onboardingCaseId === c.id))}% ready</span></Link>)}</div></div>
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold">Upcoming leavers</h2><div className="mt-3 space-y-2">{offboardingCases.map(({ case: c, employee }) => <Link key={c.id} href={`/oneflow/offboarding/cases/${c.id}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs"><span><strong>{employee?.fullName}</strong><br />{formatDate(c.lastWorkingDate)}</span><span className="font-semibold">{lifecycleReadiness(store.tasks.filter((t) => t.offboardingCaseId === c.id))}% clear</span></Link>)}{!offboardingCases.length && <p className="text-xs text-slate-400">No offboarding cases.</p>}</div></div>
      </div>

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
