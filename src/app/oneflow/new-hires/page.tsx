"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useData } from "@/components/shared/data-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { DEPARTMENTS, LOCATIONS, formatDate } from "@/lib/utils";

export default function NewHiresPage() {
  const { store, ready } = useData();
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("all");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const newHires = store.employees.filter(
      (e) => e.requiresOnboarding || e.employmentStatus === "New Hire"
    );
    return newHires
      .map((employee) => ({
        employee,
        onb: store.onboardingCases.find((c) => c.employeeId === employee.id),
      }))
      .filter(({ employee, onb }) => {
        const hay = `${employee.fullName} ${employee.role} ${employee.email}`.toLowerCase();
        if (q && !hay.includes(q.toLowerCase())) return false;
        if (department !== "all" && employee.department !== department)
          return false;
        if (location !== "all" && employee.location !== location) return false;
        if (status !== "all" && onb?.status !== status) return false;
        return true;
      });
  }, [store, q, department, location, status]);

  return (
    <OneFlowShell
      title="New hires"
      subtitle="Workers flagged for onboarding from PPG Workday"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="w-56 rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          placeholder="Search new hires…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
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
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
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
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All case statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      <div className="grid gap-3">
        {!ready && <p className="text-sm text-slate-400">Loading…</p>}
        {ready &&
          rows.map(({ employee, onb }) => (
            <div
              key={employee.id}
              className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{employee.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {employee.role} · {employee.department} · {employee.location}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Start {formatDate(employee.startDate)} · Manager{" "}
                    {employee.managerName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusChip status={employee.employmentStatus} />
                    {onb && <StatusChip status={onb.status} />}
                  </div>
                </div>
                <div className="w-48">
                  {onb ? (
                    <>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{onb.caseNumber}</span>
                        <span className="tabular-nums">{onb.overallProgress}%</span>
                      </div>
                      <ProgressBar value={onb.overallProgress} tone="blue" />
                      <Link
                        href={`/oneflow/cases/${onb.id}`}
                        className="mt-3 inline-block text-sm font-semibold text-flow-accent hover:underline"
                      >
                        Open case →
                      </Link>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">No case linked</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        {ready && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-flow-line bg-white p-8 text-center text-sm text-slate-400">
            No new hires yet. Go to PPG Workday and set a worker to{" "}
            <strong>New Hire</strong>.
          </div>
        )}
      </div>
    </OneFlowShell>
  );
}
