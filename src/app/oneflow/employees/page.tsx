"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";

export default function EmployeesPage() {
  const { session } = useAuth();
  const { ready, store } = useData();
  if (!session) return null;
  if (session.role !== "Admin" && session.role !== "HR") {
    return (
      <OneFlowShell title="Employees">
        <p className="text-sm text-slate-500">Not authorized.</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell title="Employees" subtitle="Workforce directory">
      <div className="mb-3 flex gap-2">
        <Link
          href="/oneflow/new-hires"
          className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
        >
          New Hires
        </Link>
        <Link
          href="/workday"
          className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
        >
          PPG Workday
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-flow-line bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {ready &&
              store.employees.map((e) => (
                <tr key={e.id} className="border-b border-flow-line/60">
                  <td className="px-3 py-2 font-medium">{e.fullName}</td>
                  <td className="px-3 py-2">{e.employeeNumber}</td>
                  <td className="px-3 py-2">{e.department}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={e.employmentStatus} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">{e.email}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
