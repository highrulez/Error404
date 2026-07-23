"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { DANIEL_EXIT_FORM_ID } from "@/data";

export default function ExitClearanceIndexPage() {
  const { session } = useAuth();
  const { ready, service } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !session) return;
    if (session.role === "OFFBOARDING_EMPLOYEE") {
      const form =
        service.getExitClearanceFormForEmployee(
          service.listEmployees().find((e) => e.email === session.email)?.id ||
            ""
        ) || service.getExitClearanceForm(DANIEL_EXIT_FORM_ID);
      if (form) {
        router.replace(`/oneflow/exit-clearance/${form.id}`);
        return;
      }
    }
    if (session.role === "Admin" || session.role === "HR") {
      const forms = service.listExitClearanceForms();
      if (forms[0]) {
        router.replace(`/oneflow/exit-clearance/${forms[0].id}`);
        return;
      }
    }
    router.replace("/oneflow/my-tasks");
  }, [ready, session, service, router]);

  return (
    <OneFlowShell title="Exit Clearance Form">
      <p className="text-sm text-slate-500">Opening your form…</p>
    </OneFlowShell>
  );
}
