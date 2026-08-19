"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckSquare, ListTodo } from "lucide-react";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { roleLabel } from "@/data/role-labels";
import { formatDate } from "@/lib/utils";

function overdue(dueDate: string, status: string, today: string) {
  return status === "Overdue" || (status !== "Completed" && status !== "Cancelled" && status !== "Blocked" && dueDate < today);
}

export function RoleDashboard() {
  const { session } = useAuth();
  const { ready, store, service } = useData();
  if (!session) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tasks = ready ? service.listTasksForUser(session) : [];
  const mine = tasks.filter((task) => task.assignedEmail.toLowerCase() === session.email.toLowerCase() && task.status !== "Completed" && task.status !== "Cancelled");
  const open = tasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
  const important = open.filter((task) => overdue(task.dueDate, task.status, today) || task.status === "Blocked" || task.priority === "High" || task.priority === "Critical");
  const cases = [...store.onboardingCases.map((item) => ({ id: item.id, type: "Preboarding", employeeId: item.employeeId })), ...store.offboardingCases.map((item) => ({ id: item.id, type: "Offboarding", employeeId: item.employeeId }))].map((item) => {
    const caseTasks = tasks.filter((task) => item.type === "Offboarding" ? task.offboardingCaseId === item.id : task.onboardingCaseId === item.id);
    const employee = store.employees.find((value) => value.id === item.employeeId);
    return { ...item, employee, total: caseTasks.length, completed: caseTasks.filter((task) => task.status === "Completed").length, blocked: caseTasks.filter((task) => task.status === "Blocked").length, open: caseTasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled").length };
  }).filter((item) => item.total);
  const upcoming = open.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const cards = [["My Open Tasks", mine.length, ListTodo, "bg-sky-50 text-sky-700"], ["Due Today", mine.filter((task) => task.dueDate === today).length, CalendarClock, "bg-indigo-50 text-indigo-700"], ["Overdue", mine.filter((task) => overdue(task.dueDate, task.status, today)).length, AlertTriangle, "bg-rose-50 text-rose-700"], ["Needs Attention", important.length, CheckSquare, "bg-amber-50 text-amber-700"]] as const;
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-flow-accent">Role Dashboard</p><h2 className="mt-1 text-xl font-semibold">{roleLabel(session.role)} Dashboard</h2><p className="mt-1 text-sm text-slate-500">Priorities and lifecycle responsibilities for your role.</p></div><div className="flex gap-2"><Link href="/oneflow/my-tasks" className="rounded-xl bg-flow-accent px-3 py-2 text-sm font-semibold text-white">View My Tasks</Link>{(session.role === "HR" || session.role === "HIRING_MANAGER") && <Link href="/oneflow/lifecycle-cases" className="rounded-xl border border-flow-line bg-white px-3 py-2 text-sm font-semibold">View Lifecycle Cases</Link>}</div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, Icon, tone]) => <div key={label} className={`rounded-xl p-3 ${tone}`}><div className="flex justify-between"><p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p><Icon className="h-4 w-4" /></div><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div><div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]"><section className="rounded-2xl border border-flow-line bg-white p-5 shadow-sm"><h3 className="text-base font-semibold">Current Employee Journeys</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{cases.map((item) => <div key={`${item.type}-${item.id}`} className={`rounded-xl border p-4 ${item.type === "Offboarding" ? "border-violet-100 bg-violet-50/40" : "border-cyan-100 bg-cyan-50/40"}`}><div className="flex justify-between gap-2"><p className="font-semibold">{item.employee?.fullName || "Employee"}</p><StatusChip status={item.type} /></div><p className="mt-1 text-xs text-slate-500">{item.total} relevant tasks</p><div className="mt-3 grid grid-cols-3 text-center text-xs"><div><p className="font-semibold text-emerald-700">{item.completed}</p><p>completed</p></div><div><p className="font-semibold">{item.open}</p><p>open</p></div><div><p className="font-semibold text-amber-700">{item.blocked}</p><p>blocked</p></div></div></div>)}{!cases.length && <p className="text-sm text-slate-500">No employee journeys are assigned to your role.</p>}</div></section><section className="rounded-2xl border border-flow-line bg-white p-5 shadow-sm"><h3 className="text-base font-semibold">Upcoming Work</h3><ul className="mt-3 space-y-3">{upcoming.map((task) => { const employee = store.employees.find((value) => value.id === task.employeeId); return <li key={task.id} className="border-b border-slate-100 pb-3 last:border-0"><Link href={`/oneflow/tasks/${task.id}`} className="font-medium text-slate-800 hover:text-flow-accent">{task.title}</Link><p className="mt-1 text-xs text-slate-500">{employee?.fullName} · {task.processType || "Onboarding"}</p><p className="mt-1 text-xs text-slate-500">Due {formatDate(task.dueDate)}</p></li>; })}{!upcoming.length && <li className="text-sm text-slate-500">No upcoming work.</li>}</ul></section></div>{important.length > 0 && <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4"><h3 className="text-sm font-semibold">Needs Attention</h3><p className="mt-1 text-sm text-slate-600">{important.length} important task{important.length === 1 ? "" : "s"} require review.</p></section>}</div>;
}
