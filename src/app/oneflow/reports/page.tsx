"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { lifecycleReadiness } from "@/components/oneflow/lifecycle-visibility";
import { ProgressBar, StatusChip } from "@/components/shared/status";

export default function ReportsPage() {
  const { session } = useAuth();
  const { ready, service, store } = useData();
  if (!session) return null;
  if (session.role !== "Admin" && session.role !== "HR") {
    return (
      <OneFlowShell title="Reports">
        <p className="text-sm text-slate-500">Not authorized.</p>
      </OneFlowShell>
    );
  }

  const stats = ready ? service.getDashboardStats() : null;
  const today = new Date().toISOString().slice(0, 10);
  const open = store.tasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
  const dueSoon = open.filter((task) => task.dueDate >= today && task.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const onboardingReadiness = store.onboardingCases.map((item) => lifecycleReadiness(store.tasks.filter((task) => task.onboardingCaseId === item.id)));
  const offboardingClearance = store.offboardingCases.map((item) => lifecycleReadiness(store.tasks.filter((task) => task.offboardingCaseId === item.id)));
  const teams = [...new Set(store.tasks.map((task) => task.responsibleTeam))].map((team) => {
    const tasks = store.tasks.filter((task) => task.responsibleTeam === team && task.status !== "Cancelled");
    const completed = tasks.filter((task) => task.status === "Completed").length;
    return { team, open: tasks.length - completed, percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
  }).sort((a, b) => b.open - a.open);

  return (
    <OneFlowShell title="Reports" subtitle="Operational snapshot">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "New hires", value: stats?.newHires ?? "—" },
          { label: "Open cases", value: stats?.openCases ?? "—" },
          { label: "Completed tasks", value: stats?.completedTasks ?? "—" },
          { label: "Overdue tasks", value: stats?.overdueTasks ?? "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Lifecycle readiness</h2>
          <p className="mt-1 text-xs text-slate-500">Onboarding {average(onboardingReadiness)}% · Offboarding {average(offboardingClearance)}% · {dueSoon.length} due soon</p>
          <div className="mt-3 space-y-3">{teams.map((item) => <div key={item.team}><div className="mb-1 flex justify-between gap-2 text-xs"><span>{item.team}</span><span>{item.open} open · {item.percent}% complete</span></div><ProgressBar value={item.percent} tone="blue" /></div>)}</div>
        </section>
        <section className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Department / Role Bottlenecks</h2>
          <div className="mt-3 space-y-2 text-xs">{store.onboardingCases.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"><span>{item.caseNumber} · Onboarding</span><StatusChip status={item.status} /></div>)}{store.offboardingCases.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"><span>{item.caseNumber} · Offboarding</span><StatusChip status={item.status} /></div>)}</div>
          <p className="mt-4 text-xs text-slate-500">Power BI is a future production reporting direction; it is not embedded in this Phase 1 prototype.</p>
        </section>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/oneflow/automation-runs" className="text-flow-accent underline">
          Automation Runs
        </Link>
        <Link href="/oneflow/offboarding" className="text-flow-accent underline">
          Offboarding dashboard
        </Link>
        <Link href="/oneflow/my-tasks" className="text-flow-accent underline">
          My Tasks queue
        </Link>
      </div>
    </OneFlowShell>
  );
}
