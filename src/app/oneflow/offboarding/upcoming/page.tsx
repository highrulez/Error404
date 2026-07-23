"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function UpcomingDeparturesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, store } = useData();

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(() => {
    if (!ready) return [];
    return store.offboardingCases
      .filter(
        (c) =>
          c.status !== "Completed" &&
          c.status !== "Cancelled" &&
          c.lastWorkingDate >= today
      )
      .sort((a, b) => a.lastWorkingDate.localeCompare(b.lastWorkingDate))
      .map((c) => ({
        case: c,
        employee: store.employees.find((e) => e.id === c.employeeId),
      }));
  }, [ready, store.offboardingCases, store.employees, today]);

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Upcoming departures">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Upcoming departures"
      subtitle="Workers with a future last working date"
    >
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/oneflow/offboarding" className="text-flow-accent hover:underline">
          ← Back to offboarding overview
        </Link>
      </p>

      <div className="overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Last working day</th>
              <th className="px-4 py-3">Termination</th>
              <th className="px-4 py-3">Immediate access</th>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(({ case: c, employee }) => (
              <tr key={c.id} className="border-t border-flow-line">
                <td className="px-4 py-3">
                  <p className="font-semibold">{employee?.fullName ?? "—"}</p>
                  <p className="text-xs text-slate-400">
                    {employee?.department} · {employee?.location}
                  </p>
                </td>
                <td className="px-4 py-3">{formatDate(c.lastWorkingDate)}</td>
                <td className="px-4 py-3">{c.terminationType}</td>
                <td className="px-4 py-3">
                  {c.immediateAccessRemovalRequired ? (
                    <StatusChip status="Critical" />
                  ) : (
                    <StatusChip status="Scheduled" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/oneflow/offboarding/cases/${c.id}`}
                    className="font-semibold text-flow-accent hover:underline"
                  >
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={c.status} />
                </td>
              </tr>
            ))}
            {upcoming.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={6}>
                  No upcoming departures scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
