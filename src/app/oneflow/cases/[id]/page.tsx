"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { OnboardingCaseView } from "@/components/oneflow/case-view";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { ALICIA_ONBOARDING_CASE_ID } from "@/data/alicia-types";

/**
 * Admin onboarding case page — Onboarding Employees are redirected before
 * any internal case data is rendered.
 */
export default function CaseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session, ready: authReady } = useAuth();
  const { ready, store } = useData();
  const router = useRouter();

  const isOnboardingEmployee = session?.role === "ONBOARDING_EMPLOYEE";

  useEffect(() => {
    if (!authReady || !ready || !session || !isOnboardingEmployee) return;
    const own = store.onboardingCases.find((c) => {
      const e = store.employees.find((emp) => emp.id === c.employeeId);
      return e && e.email.toLowerCase() === session.email.toLowerCase();
    });
    router.replace(
      `/oneflow/my-onboarding/${own?.id ?? ALICIA_ONBOARDING_CASE_ID}`
    );
  }, [
    authReady,
    ready,
    session,
    isOnboardingEmployee,
    store.onboardingCases,
    store.employees,
    router,
  ]);

  if (!session) return null;

  if (isOnboardingEmployee) {
    return (
      <OneFlowShell title="My Onboarding">
        <p className="text-sm text-slate-500">Redirecting to your onboarding…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Onboarding details"
      subtitle="Grouped checklist, progress, and activity"
    >
      <OnboardingCaseView caseId={id} />
    </OneFlowShell>
  );
}
