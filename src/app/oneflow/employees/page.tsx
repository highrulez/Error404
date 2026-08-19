"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";

export default function EmployeesPage() {
  const { session } = useAuth();
  const { ready, store } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const employees = useMemo(() => store.employees.filter((employee) => { const matches = [employee.fullName, employee.department, employee.email].join(" ").toLowerCase().includes(query.toLowerCase()); return matches && (status === "all" || employee.employmentStatus === status); }), [store.employees, query, status]);
  if (!session) return null;
  if (session.role !== "Admin" && session.role !== "HR") return <OneFlowShell title="Employees"><p className="text-sm text-slate-500">Not authorized.</p></OneFlowShell>;
  const counts = (value: string) => store.employees.filter((employee) => employee.employmentStatus === value).length;
  return <OneFlowShell title="Employees" subtitle="Workforce directory and lifecycle status">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Employees", store.employees.length, "bg-sky-50 text-sky-700"], ["Active", counts("Active"), "bg-emerald-50 text-emerald-700"], ["Preboarding", counts("Preboarding"), "bg-cyan-50 text-cyan-700"], ["Offboarding", counts("Offboarding"), "bg-violet-50 text-violet-700"]].map(([label, value, tone]) => <div key={String(label)} className={`rounded-xl px-3 py-2 ${tone}`}><p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}</div><div className="flex gap-2"><Link href="/oneflow/new-hires" className="rounded-xl border border-flow-line bg-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-slate-50">View New Hires</Link><Link href="/workday" className="rounded-xl bg-flow-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700">Open PPG Workday</Link></div></div>
    <div className="mb-3 flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search employees</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, department or email" className="w-full rounded-xl border border-flow-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-flow-line bg-white px-3 py-2 text-sm"><option value="all">All statuses</option>{["Active", "Preboarding", "Offboarding"].map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="overflow-x-auto rounded-2xl border border-flow-line bg-white shadow-sm"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-b border-flow-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Email</th></tr></thead><tbody>{ready && employees.map((employee) => <tr key={employee.id} className="border-b border-flow-line/60 last:border-0 hover:bg-slate-50"><td className="px-4 py-3"><Link href={`/workday/employees/${employee.id}`} className="flex items-center gap-3 hover:text-flow-accent"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-flow-accent">{employee.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><span><strong className="block">{employee.fullName}</strong><span className="text-xs text-slate-500">{employee.role}</span></span></Link></td><td className="px-4 py-3 text-slate-600">{employee.employeeNumber}</td><td className="px-4 py-3 text-slate-600">{employee.department}</td><td className="px-4 py-3"><StatusChip status={employee.employmentStatus} /></td><td className="px-4 py-3 text-slate-600">{employee.email}</td></tr>)}{ready && !employees.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500"><Users className="mx-auto mb-2 h-5 w-5 text-slate-400" />No employees match this filter.</td></tr>}</tbody></table></div>
  </OneFlowShell>;
}
