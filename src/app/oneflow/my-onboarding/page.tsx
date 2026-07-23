"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { ALICIA_ONBOARDING_CASE_ID } from "@/data/alicia-types";

export default function MyOnboardingPage() {
  const { session } = useAuth();
  const { store } = useData();
  if (!session) return null;

  const employee = store.employees.find(
    (e) => e.email.toLowerCase() === session.email.toLowerCase()
  );
  const onbCase =
    store.onboardingCases.find((c) => c.employeeId === employee?.id) ||
    (session.role === "ONBOARDING_EMPLOYEE"
      ? store.onboardingCases.find((c) => c.id === ALICIA_ONBOARDING_CASE_ID)
      : undefined);

  return (
    <OneFlowShell title="My Onboarding" subtitle="Your onboarding journey">
      {!onbCase ? (
        <p className="text-sm text-slate-500">
          No onboarding case found for your account.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{onbCase.caseNumber}</p>
                <p className="text-xs text-slate-500">Onboarding case</p>
              </div>
              <StatusChip status={onbCase.status} />
            </div>
            <div className="mt-3">
              <ProgressBar value={onbCase.overallProgress} tone="blue" />
            </div>
            <Link
              href={`/oneflow/my-onboarding/${onbCase.id}`}
              className="mt-3 inline-block rounded-md bg-flow-accent px-3 py-2 text-sm font-semibold text-white"
            >
              View My Onboarding
            </Link>
          </div>
        </div>
      )}
    </OneFlowShell>
  );
}
