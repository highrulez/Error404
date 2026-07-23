"use client";

import { useMemo } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function MyNewHiresPage() {
  const { session } = useAuth();
  const { store, ready } = useData();

  const rows = useMemo(() => {
    if (!session) return [];
    return store.employees
      .filter((e) => {
        if (!(e.requiresOnboarding || e.employmentStatus === "New Hire"))
          return false;
        const mgr = e.managerEmail.toLowerCase();
        return (
          mgr === session.email.toLowerCase() ||
          mgr === "manager@ppg-demo.com"
        );
      })
      .map((employee) => ({
        employee,
        onb: store.onboardingCases.find((c) => c.employeeId === employee.id),
      }));
  }, [session, store]);

  if (!session) return null;

  return (
    <OneFlowShell
      title="My New Hires"
      subtitle="Employees where you are the hiring manager"
    >
      <div className="space-y-3">
        {rows.map(({ employee, onb }) => (
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
                  Start {formatDate(employee.startDate)}
                </p>
                <div className="mt-2 flex gap-2">
                  <StatusChip status={employee.employmentStatus} />
                  {onb && <StatusChip status={onb.status} />}
                </div>
              </div>
              {onb ? (
                <div className="w-48">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{onb.caseNumber}</span>
                    <span>{onb.overallProgress}%</span>
                  </div>
                  <ProgressBar value={onb.overallProgress} tone="blue" />
                  <Link
                    href={`/oneflow/cases/${onb.id}`}
                    className="mt-2 inline-block text-sm font-semibold text-flow-accent hover:underline"
                  >
                    Open case →
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No case yet</p>
              )}
            </div>
          </div>
        ))}
        {ready && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-flow-line bg-white p-8 text-center text-sm text-slate-400">
            No new hires assigned to you yet.
          </div>
        )}
      </div>
    </OneFlowShell>
  );
}
