"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { OffboardingDemoControls } from "@/components/oneflow/offboarding-demo-controls";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function OffboardingOverviewPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, service, store, refresh } = useData();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const stats = ready
    ? service.getOffboardingDashboardStats()
    : {
        activeCases: 0,
        upcomingDepartures: 0,
        assetsAwaitingReturn: 0,
        accessRemovalPending: 0,
        criticalRisk: 0,
        avgProgress: 0,
      };

  const recentCases = useMemo(() => {
    return store.offboardingCases.slice(0, 5).map((c) => ({
      case: c,
      employee: store.employees.find((e) => e.id === c.employeeId),
    }));
  }, [store.offboardingCases, store.employees]);

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Offboarding">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Offboarding"
      subtitle="Departures, clearance, and access removal"
    >
      {banner && (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {banner}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: "Active cases", value: stats.activeCases },
          { label: "Upcoming departures", value: stats.upcomingDepartures },
          { label: "Assets awaiting return", value: stats.assetsAwaitingReturn },
          { label: "Access removal pending", value: stats.accessRemovalPending },
          { label: "Security / critical risk", value: stats.criticalRisk },
          { label: "Avg progress", value: `${stats.avgProgress}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/oneflow/offboarding/upcoming"
          className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          Upcoming departures
        </Link>
        <Link
          href="/oneflow/offboarding/cases"
          className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
        >
          All cases
        </Link>
        <Link
          href="/oneflow/offboarding/assets"
          className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Assets awaiting return
        </Link>
        <Link
          href="/oneflow/offboarding/access-removal"
          className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Access removal queue
        </Link>
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
        <div className="border-b border-flow-line px-4 py-3">
          <h2 className="text-sm font-semibold">Recent offboarding cases</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Last day</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentCases.map(({ case: c, employee }) => (
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
                  <p className="text-xs text-slate-400">
                    {employee?.department}
                  </p>
                </td>
                <td className="px-4 py-3">{formatDate(c.lastWorkingDate)}</td>
                <td className="w-40 px-4 py-3">
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
            {recentCases.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={6}>
                  No offboarding cases yet. In PPG Workday, set a worker to{" "}
                  <strong>Offboarding</strong> or use demo controls below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OffboardingDemoControls
        onDone={(msg) => {
          setBanner(msg);
          refresh();
        }}
      />
    </OneFlowShell>
  );
}
