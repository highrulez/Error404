"use client";

import { MapPin } from "lucide-react";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { roleLabel } from "@/data/role-labels";

export default function MyProfilePage() {
  const { session } = useAuth(); const { store } = useData(); if (!session) return null;
  const employee = store.employees.find((item) => item.email.toLowerCase() === session.email.toLowerCase());
  const initials = (employee?.fullName || session.name).split(/[\s,]+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const fields = [["Employee ID", employee?.employeeNumber], ["Department", employee?.department], ["Location", employee?.location], ["Start Date", employee?.startDate ? formatDate(employee.startDate) : null], ["Manager", employee?.managerName], ["Email", session.email], ["Role", roleLabel(session.role)]];
  return <OneFlowShell title="My Profile" subtitle="Your OneFlow account and employment details"><div className="max-w-3xl rounded-2xl border border-flow-line bg-white p-5 shadow-sm"><header className="flex flex-wrap items-center gap-4 border-b border-flow-line pb-5"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-xl font-semibold text-flow-accent">{initials}</span><div><h2 className="text-xl font-semibold">{employee?.fullName || session.name}</h2><p className="mt-1 text-sm text-slate-500">{employee?.role || roleLabel(session.role)}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{employee?.location || "—"}</p></div>{employee && <div className="ml-auto"><StatusChip status={employee.employmentStatus} /></div>}</header><dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">{fields.map(([label, value]) => <div key={String(label)}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value || "—"}</dd></div>)}</dl></div></OneFlowShell>;
}
