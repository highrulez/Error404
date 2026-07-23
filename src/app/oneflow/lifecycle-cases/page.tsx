"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";

export default function LifecycleCasesPage() {
  const { session } = useAuth();
  const { ready, store } = useData();
  if (!session) return null;
  if (
    session.role !== "Admin" &&
    session.role !== "HR" &&
    session.role !== "HIRING_MANAGER"
  ) {
    return (
      <OneFlowShell title="Lifecycle Cases">
        <p className="text-sm text-slate-500">Not authorized.</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell title="Lifecycle Cases" subtitle="Onboarding and Offboarding">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Onboarding</h2>
          <Link href="/oneflow/new-hires" className="text-xs text-flow-accent underline">
            Manage new hires
          </Link>
        </div>
        <div className="space-y-2">
          {ready &&
            store.onboardingCases.map((c) => {
              const emp = store.employees.find((e) => e.id === c.employeeId);
              return (
                <Link
                  key={c.id}
                  href={`/oneflow/cases/${c.id}`}
                  className="block rounded-xl border border-flow-line bg-white p-3 shadow-sm hover:border-flow-accent"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{emp?.fullName ?? c.employeeId}</p>
                      <p className="text-xs text-slate-500">{c.caseNumber}</p>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={c.overallProgress} />
                  </div>
                </Link>
              );
            })}
          {ready && store.onboardingCases.length === 0 && (
            <p className="text-sm text-slate-400">No onboarding cases.</p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Offboarding</h2>
          <Link href="/oneflow/offboarding" className="text-xs text-flow-accent underline">
            Offboarding hub
          </Link>
        </div>
        <div className="space-y-2">
          {ready &&
            store.offboardingCases.map((c) => {
              const emp = store.employees.find((e) => e.id === c.employeeId);
              return (
                <Link
                  key={c.id}
                  href={`/oneflow/offboarding/cases/${c.id}`}
                  className="block rounded-xl border border-flow-line bg-white p-3 shadow-sm hover:border-flow-accent"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{emp?.fullName ?? c.employeeId}</p>
                      <p className="text-xs text-slate-500">{c.caseNumber}</p>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={c.overallProgress} tone="blue" />
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </OneFlowShell>
  );
}
