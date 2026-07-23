"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { OFFBOARDING_CASE_STATUSES } from "@/data";
import { formatDate } from "@/lib/utils";

export default function OffboardingCasesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, store } = useData();
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const cases = useMemo(() => {
    if (!ready) return [];
    return store.offboardingCases
      .filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (riskFilter !== "all" && c.riskLevel !== riskFilter) return false;
        return true;
      })
      .map((c) => ({
        case: c,
        employee: store.employees.find((e) => e.id === c.employeeId),
      }));
  }, [ready, store.offboardingCases, store.employees, statusFilter, riskFilter]);

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Offboarding cases">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell title="Offboarding cases" subtitle="All departure workflows">
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/oneflow/offboarding" className="text-flow-accent hover:underline">
          ← Back to offboarding overview
        </Link>
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {OFFBOARDING_CASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="all">All risk levels</option>
          {["Normal", "Attention Required", "Security Risk", "Critical"].map(
            (r) => (
              <option key={r} value={r}>
                {r}
              </option>
            )
          )}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Last day</th>
              <th className="px-4 py-3">Termination</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map(({ case: c, employee }) => (
              <tr key={c.id} className="border-t border-flow-line">
                <td className="px-4 py-3">
                  <Link
                    href={`/oneflow/offboarding/cases/${c.id}`}
                    className="font-semibold text-flow-accent hover:underline"
                  >
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {employee?.fullName ?? "—"}
                  <p className="text-xs text-slate-400">{employee?.department}</p>
                </td>
                <td className="px-4 py-3">{formatDate(c.lastWorkingDate)}</td>
                <td className="px-4 py-3">{c.terminationType}</td>
                <td className="w-36 px-4 py-3">
                  <div className="mb-1 text-xs tabular-nums">
                    {c.overallProgress}%
                  </div>
                  <ProgressBar value={c.overallProgress} tone="blue" />
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={c.riskLevel} />
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={c.status} />
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={7}>
                  No offboarding cases match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
