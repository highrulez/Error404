"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { InductionFormDocument } from "@/components/oneflow/induction-form-document";
import type { PaperFormMode } from "@/components/oneflow/paper-form-shared";

export default function InductionPreviewPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const search = useSearchParams();
  const modeParam = search.get("mode") || "draft";
  const autoPrint = search.get("print") === "1" || modeParam === "print";
  const { session } = useAuth();
  const { ready, service } = useData();
  const form = ready ? service.getInductionForm(formId) : undefined;

  const mode: PaperFormMode = useMemo(() => {
    if (modeParam === "print") return "print";
    if (modeParam === "submitted") return "submitted";
    if (modeParam === "completed") return "completed";
    if (modeParam === "review") return "review";
    return "draft";
  }, [modeParam]);

  useEffect(() => {
    if (!form || !autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [form, autoPrint]);

  if (!ready) {
    return <p className="p-6 text-sm text-slate-500">Loading your form...</p>;
  }

  if (!form) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-700">
          This onboarding form could not be found.
        </p>
        <Link
          href="/oneflow/my-forms"
          className="mt-3 inline-block text-sm text-flow-accent underline"
        >
          Back to My Forms
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="p-6 text-sm text-rose-700">
        You do not have permission to view this form.
      </p>
    );
  }

  if (
    session.role !== "Admin" &&
    session.role !== "HR" &&
    session.email.toLowerCase() !== form.employeeEmail.toLowerCase()
  ) {
    return (
      <p className="p-6 text-sm text-rose-700">
        You do not have permission to view this form.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/oneflow/my-forms/induction/${form.id}`}
          className="text-sm text-blue-700 underline"
        >
          Back to form
        </Link>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>
      <InductionFormDocument
        form={{
          ...form,
          acknowledgementDate: form.acknowledgementDate ?? null,
          hrReceivedDate: form.hrReceivedDate ?? null,
          hrRemarks: form.hrRemarks ?? "",
        }}
        mode={mode}
        sections={form.inductionSections}
        declaration={form.employeeDeclaration}
        signature={form.typedSignature}
        canEditEmployee={false}
        canEditPresenter={false}
      />
    </div>
  );
}
