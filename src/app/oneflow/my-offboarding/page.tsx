"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { DANIEL_OFFBOARDING_CASE_ID } from "@/data";

export default function MyOffboardingPage() {
  const { session } = useAuth();
  const { ready, store, service } = useData();
  if (!session) return null;

  const employee = store.employees.find(
    (e) => e.email.toLowerCase() === session.email.toLowerCase()
  );
  const offCase =
    store.offboardingCases.find((c) => c.employeeId === employee?.id) ||
    (session.role === "OFFBOARDING_EMPLOYEE"
      ? store.offboardingCases.find((c) => c.id === DANIEL_OFFBOARDING_CASE_ID)
      : undefined);

  return (
    <OneFlowShell title="My Offboarding" subtitle="Your offboarding journey">
      {!offCase ? (
        <p className="text-sm text-slate-500">
          No offboarding case found for your account.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{offCase.caseNumber}</p>
                <p className="text-xs text-slate-500">Offboarding case</p>
              </div>
              <StatusChip status={offCase.status} />
            </div>
            <div className="mt-3">
              <ProgressBar value={offCase.overallProgress} tone="blue" />
            </div>
            <Link
              href={`/oneflow/my-offboarding/${offCase.id}`}
              className="mt-3 inline-block rounded-md bg-flow-accent px-3 py-2 text-sm font-semibold text-white"
            >
              View My Offboarding
            </Link>
          </div>
          {ready &&
            service
              .listMyForms(session)
              .filter((f) => f.kind === "Exit Clearance")
              .map((f) => (
                <Link
                  key={f.id}
                  href={f.href}
                  className="block rounded-xl border border-flow-line bg-white p-4 text-sm font-semibold shadow-sm hover:border-flow-accent"
                >
                  Continue {f.formName} →
                </Link>
              ))}
        </div>
      )}
    </OneFlowShell>
  );
}
