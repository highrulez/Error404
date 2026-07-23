"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WorkdayShell } from "@/components/workday/shell";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate, EMPLOYMENT_STATUSES, DEPARTMENTS, LOCATIONS } from "@/lib/utils";

export default function WorkdayEmployeesPage() {
  const { store, ready } = useData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [location, setLocation] = useState("all");

  const rows = useMemo(() => {
    return store.employees.filter((e) => {
      const hay =
        `${e.fullName} ${e.employeeNumber} ${e.email} ${e.role}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (status !== "all" && e.employmentStatus !== status) return false;
      if (department !== "all" && e.department !== department) return false;
      if (location !== "all" && e.location !== location) return false;
      return true;
    });
  }, [store.employees, q, status, department, location]);

  return (
    <WorkdayShell
      title="Workers"
      subtitle="Enterprise worker directory (PPG Workday mockup)"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="w-56 rounded-md border border-hris-line bg-white px-3 py-2 text-sm"
            placeholder="Search workers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-md border border-hris-line bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-hris-line bg-white px-3 py-2 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-hris-line bg-white px-3 py-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="all">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <Link
          href="/workday/employees/new"
          className="rounded-md bg-hris-accent px-4 py-2 text-sm font-semibold text-white hover:bg-hris-accentDark"
        >
          Create worker
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-hris-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Worker</th>
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Start</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {!ready && (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {ready &&
              rows.map((e) => (
                <tr key={e.id} className="border-t border-hris-line hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/workday/employees/${e.id}`}
                      className="font-semibold text-hris-accentDark hover:underline"
                    >
                      {e.fullName}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {e.employeeNumber} · {e.role}
                    </p>
                  </td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3">{e.location}</td>
                  <td className="px-4 py-3">{formatDate(e.startDate)}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={e.employmentStatus} />
                  </td>
                </tr>
              ))}
            {ready && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={5}>
                  No workers match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </WorkdayShell>
  );
}
