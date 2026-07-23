"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { OffboardingCaseView } from "@/components/oneflow/offboarding-case-view";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";

export default function OffboardingCaseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session } = useAuth();
  const { ready, store } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !session) return;
    if (session.role === "OFFBOARDING_EMPLOYEE") {
      const employee = store.employees.find(
        (e) => e.email.toLowerCase() === session.email.toLowerCase()
      );
      const own =
        store.offboardingCases.find((c) => c.employeeId === employee?.id) ||
        store.offboardingCases.find((c) => c.id === id);
      router.replace(
        own
          ? `/oneflow/my-offboarding/${own.id}`
          : "/oneflow/my-offboarding"
      );
    }
  }, [ready, session, store.employees, store.offboardingCases, id, router]);

  if (!session) return null;

  if (session.role === "OFFBOARDING_EMPLOYEE") {
    return (
      <OneFlowShell title="Redirecting…">
        <p className="text-sm text-slate-500">
          Opening your employee offboarding view…
        </p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Offboarding details"
      subtitle="Clearance checklist, risk, and notifications"
    >
      <p className="mb-4 text-sm text-slate-500">
        <Link
          href="/oneflow/offboarding/cases"
          className="text-flow-accent hover:underline"
        >
          ← Back to all cases
        </Link>
      </p>
      <OffboardingCaseView caseId={id} />
    </OneFlowShell>
  );
}
