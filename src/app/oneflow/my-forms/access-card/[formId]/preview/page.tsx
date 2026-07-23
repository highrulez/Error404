"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { AccessCardFormDocument } from "@/components/oneflow/access-card-form-document";
import type { PaperFormMode } from "@/components/oneflow/paper-form-shared";
import { ACCESS_CARD_LOCATIONS } from "@/data/access-card-types";

export default function AccessCardPreviewPage({
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
  const form = ready ? service.getAccessCardForm(formId) : undefined;

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

  if (!session) {
    return (
      <p className="p-6 text-sm text-rose-700">
        You do not have permission to view this form.
      </p>
    );
  }

  if (!form) {
    return (
      <p className="p-6 text-sm text-slate-500">
        This onboarding form could not be found.
      </p>
    );
  }

  if (
    session.role !== "Admin" &&
    session.role !== "ADMINISTRATION" &&
    session.email.toLowerCase() !== form.employeeEmail.toLowerCase()
  ) {
    return (
      <p className="p-6 text-sm text-rose-700">
        You do not have permission to view this form.
      </p>
    );
  }

  const known = ACCESS_CARD_LOCATIONS.includes(
    form.locationUnit as (typeof ACCESS_CARD_LOCATIONS)[number]
  );
  const maskPin =
    session.role !== "Admin" &&
    session.role !== "ADMINISTRATION" &&
    session.email.toLowerCase() === form.employeeEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/oneflow/my-forms/access-card/${form.id}`}
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
      <AccessCardFormDocument
        form={form}
        draft={{
          companyNameOnCard: form.companyNameOnCard,
          locationUnit: known ? form.locationUnit : "__custom__",
          customLocation: known ? "" : form.locationUnit,
          applicantName: form.applicantName,
          gender: form.gender,
          officeTelephone: form.officeTelephone,
          mobileTelephone: form.mobileTelephone,
          nameOnCard: form.nameOnCard,
          identityDocumentType: form.identityDocumentType,
          identityDocumentNumber: form.identityDocumentNumber,
          photoDataUrl: form.photoDataUrl,
          photoAttachmentId: form.photoAttachmentId,
          employeeDeclarationConfirmed: form.employeeDeclarationConfirmed,
          employeeTypedSignature: form.employeeTypedSignature,
          officeUseOnly: form.officeUseOnly,
        }}
        mode={mode}
        canEditEmployee={false}
        canEditOffice={false}
        maskPin={maskPin}
      />
    </div>
  );
}
