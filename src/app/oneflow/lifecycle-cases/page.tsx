"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays } from "lucide-react";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { lifecycleReadiness } from "@/components/oneflow/lifecycle-visibility";

function CaseCard({ type, caseId }: { type: "Onboarding" | "Offboarding"; caseId: string }) {
  const { store } = useData();
  const caseItem = type === "Onboarding" ? store.onboardingCases.find((item) => item.id === caseId) : store.offboardingCases.find((item) => item.id === caseId);
  if (!caseItem) return null;
  const employee = store.employees.find((item) => item.id === caseItem.employeeId);
  const tasks = store.tasks.filter((task) => type === "Onboarding" ? task.onboardingCaseId === caseId : task.offboardingCaseId === caseId);
  const applicable = tasks.filter((task) => task.status !== "Cancelled");
  const completed = applicable.filter((task) => task.status === "Completed").length;
  const readiness = lifecycleReadiness(tasks);
  const open = applicable.filter((task) => task.status !== "Completed");
  const attention = open.find((task) => task.status === "Blocked" || task.status === "Overdue") || open.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const teams = [...new Set(tasks.map((task) => task.responsibleTeam))].slice(0, 4);
  const href = type === "Onboarding" ? `/oneflow/cases/${caseId}` : `/oneflow/offboarding/cases/${caseId}`;
  const lifecycleLabel = type === "Onboarding" ? "Preboarding" : "Offboarding";
  const dueDate = type === "Onboarding" ? employee?.startDate : "lastWorkingDate" in caseItem ? caseItem.lastWorkingDate : null;

  return <Link href={href} className={`group block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${type === "Onboarding" ? "border-cyan-100 hover:border-cyan-300" : "border-violet-100 hover:border-violet-300"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-lg font-semibold text-slate-900">{employee?.fullName ?? caseItem.employeeId}</p><p className="mt-1 text-sm text-slate-500">{employee?.role || "Employee"}</p><p className="mt-0.5 text-xs text-slate-400">{employee?.department} · {caseItem.caseNumber}</p></div><div className="flex flex-wrap justify-end gap-1.5"><StatusChip status={lifecycleLabel} /><StatusChip status={caseItem.status} /></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className={`rounded-xl p-3 ${type === "Onboarding" ? "bg-cyan-50" : "bg-violet-50"}`}><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{type === "Onboarding" ? "Day 1 Readiness" : "Exit Clearance"}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{readiness}%</p><ProgressBar value={readiness} tone="blue" /></div><div className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{type === "Onboarding" ? "Starts" : "Last working day"}</p><p className="mt-2 text-sm font-semibold text-slate-800">{formatDate(dueDate || "")}</p><p className="mt-1 text-xs text-slate-500">{completed} of {applicable.length} tasks completed</p></div></div>
    {attention && <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" /><span className="min-w-0 flex-1 truncate"><strong>Next attention:</strong> {attention.title} · {attention.responsibleTeam}</span><StatusChip status={attention.status} /></div>}
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{teams.map((team) => { const teamTasks = tasks.filter((task) => task.responsibleTeam === team); const teamOpen = teamTasks.some((task) => task.status !== "Completed" && task.status !== "Cancelled"); return <div key={team} className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"><p className="truncate text-slate-600">{team}</p><p className={`mt-0.5 font-semibold ${teamOpen ? "text-slate-700" : "text-emerald-700"}`}>{teamOpen ? "In progress" : "Complete"}</p></div>; })}</div>
    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-flow-accent">Open Lifecycle Case <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></div>
  </Link>;
}

export default function LifecycleCasesPage() {
  const { session } = useAuth();
  const { ready, store } = useData();
  if (!session) return null;
  if (session.role !== "Admin" && session.role !== "HR" && session.role !== "HIRING_MANAGER") return <OneFlowShell title="Lifecycle Cases"><p className="text-sm text-slate-500">Not authorized.</p></OneFlowShell>;
  return <OneFlowShell title="Lifecycle Cases" subtitle="Onboarding and offboarding readiness at a glance">
    <div className="space-y-7">{(["Onboarding", "Offboarding"] as const).map((type) => { const cases = type === "Onboarding" ? store.onboardingCases : store.offboardingCases; return <section key={type}><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold">{type}</h2><p className="text-xs text-slate-500">{type === "Onboarding" ? "Start-day readiness and cross-functional preparation" : "Clearance, access removal and exit coordination"}</p></div><Link href={type === "Onboarding" ? "/oneflow/new-hires" : "/oneflow/offboarding"} className="text-xs font-semibold text-flow-accent hover:underline">{type === "Onboarding" ? "Manage new hires" : "Open offboarding hub"}</Link></div><div className="grid gap-4 xl:grid-cols-2">{ready && cases.map((item) => <CaseCard key={item.id} type={type} caseId={item.id} />)}{ready && !cases.length && <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No {type.toLowerCase()} cases.</p>}</div></section>; })}</div>
  </OneFlowShell>;
}
