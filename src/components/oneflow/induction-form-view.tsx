"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { InductionFormDocument } from "@/components/oneflow/induction-form-document";
import {
  FormStateMessage,
  FormToolbar,
} from "@/components/oneflow/paper-form-shared";
import type {
  InductionChecklistForm,
  InductionSection,
} from "@/data/induction-types";
import {
  incompleteRequiredInductionSections,
  inductionSectionProgress,
} from "@/data/induction-seed";

function normalizeForm(raw: InductionChecklistForm): InductionChecklistForm {
  return {
    ...raw,
    acknowledgementDate: raw.acknowledgementDate ?? null,
    hrReceivedDate: raw.hrReceivedDate ?? null,
    hrRemarks: raw.hrRemarks ?? "",
    inductionSections: raw.inductionSections.map((s) => ({
      ...s,
      required: s.required !== false,
    })),
  };
}

export function InductionFormView({ formId }: { formId: string }) {
  const { session } = useAuth();
  const { ready, service, refresh } = useData();
  const [form, setForm] = useState<InductionChecklistForm | null>(null);
  const [sections, setSections] = useState<InductionSection[]>([]);
  const [declaration, setDeclaration] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "notfound" | "unauthorized"
  >("loading");

  useEffect(() => {
    if (!ready) {
      setLoadState("loading");
      return;
    }
    if (!session) {
      setLoadState("unauthorized");
      setError("You do not have permission to view this form.");
      return;
    }
    setLoadState("loading");
    setError(null);
    try {
      // Resolve by repository ID (including Alicia stable / legacy aliases)
      const existing = service.getInductionForm(formId);
      if (!existing) {
        console.warn("[OneFlow] Induction form not found", formId);
        setLoadState("notfound");
        setError("This onboarding form could not be found.");
        return;
      }
      const opened = service.openInductionForm(session, existing.id);
      if (!opened.ok) {
        setLoadState("unauthorized");
        setError(opened.error || "You do not have permission to view this form.");
        return;
      }
      const normalized = normalizeForm(opened.form);
      setForm(normalized);
      setSections(normalized.inductionSections);
      setDeclaration(normalized.employeeDeclaration);
      setSignature(normalized.typedSignature);
      setLoadState("ready");
      refresh();
    } catch (err) {
      console.error("[OneFlow] Induction form init failed", err);
      setLoadState("notfound");
      setError(
        "We could not prepare this form. Please return to My Forms and try again."
      );
    }
  }, [ready, session, formId, service, refresh]);

  const isHr = session?.role === "HR" || session?.role === "Admin";
  const isEmployeeOwner =
    session &&
    form &&
    (session.role === "ONBOARDING_EMPLOYEE" ||
      session.role === "OFFBOARDING_EMPLOYEE" ||
      session.email.toLowerCase() === form.employeeEmail.toLowerCase());

  const employeeEditable =
    Boolean(form) &&
    Boolean(isEmployeeOwner || session?.role === "Admin") &&
    [
      "Sent",
      "Opened",
      "Draft",
      "Sessions In Progress",
      "Ready for Employee Acknowledgement",
      "Returned for Correction",
    ].includes(form!.formStatus);

  const presenterEditable =
    Boolean(isHr) &&
    form != null &&
    !["Completed"].includes(form.formStatus);

  const incomplete = useMemo(
    () =>
      form
        ? incompleteRequiredInductionSections({
            ...form,
            inductionSections: sections,
          })
        : [],
    [form, sections]
  );

  const progress = useMemo(
    () =>
      form
        ? inductionSectionProgress({
            ...form,
            inductionSections: sections,
          })
        : { required: 0, cleared: 0, pending: [], percent: 0 },
    [form, sections]
  );

  const isEmployeeViewer =
    session?.role === "ONBOARDING_EMPLOYEE" ||
    (session &&
      form &&
      session.email.toLowerCase() === form.employeeEmail.toLowerCase());

  if (!session && ready) {
    return (
      <OneFlowShell title="Induction Checklist">
        <FormStateMessage title="You do not have permission to view this form." />
      </OneFlowShell>
    );
  }

  if (!ready || loadState === "loading") {
    return (
      <OneFlowShell title="Induction Checklist">
        <p className="text-sm text-slate-500">Loading your form...</p>
      </OneFlowShell>
    );
  }

  if (loadState === "unauthorized") {
    return (
      <OneFlowShell title="Induction Checklist">
        <FormStateMessage
          title="You do not have permission to view this form."
          detail={error || undefined}
        />
      </OneFlowShell>
    );
  }

  if (loadState !== "ready" || !form) {
    return (
      <OneFlowShell title="Induction Checklist">
        <FormStateMessage
          title={error || "This onboarding form could not be found."}
        />
      </OneFlowShell>
    );
  }

  const save = () => {
    setBusy(true);
    const r = service.saveInductionDraft(session!, formId, {
      inductionSections: sections,
      employeeDeclaration: declaration,
      typedSignature: signature,
    });
    setBanner(r.ok ? "Draft saved." : r.error);
    if (r.ok) {
      setForm(normalizeForm(r.form));
      refresh();
    }
    setBusy(false);
  };

  const submit = () => {
    if (incomplete.length) {
      const names = [...new Set(incomplete.map((s) => s.sectionName))];
      setBanner(
        `Final submission is unavailable until these required sessions are completed:\n${names
          .map((n) => `• ${n}`)
          .join("\n")}`
      );
      return;
    }
    setBusy(true);
    const r = service.submitInductionForm(session!, formId, {
      inductionSections: sections,
      employeeDeclaration: declaration,
      typedSignature: signature,
    });
    setBanner(r.ok ? "Submitted to HR for review." : r.error);
    if (r.ok) {
      setForm(normalizeForm(r.form));
      refresh();
    }
    setBusy(false);
  };

  return (
    <OneFlowShell
      title="Induction Checklist for New Employees"
      subtitle={`${form.employeeName} · ${form.department}`}
    >
      <FormToolbar
        backHref="/oneflow/my-forms"
        status={form.formStatus}
        lastSaved={form.updatedAt}
        canEdit={Boolean(employeeEditable || presenterEditable)}
        onSave={employeeEditable || presenterEditable ? save : undefined}
        onSubmit={
          employeeEditable && incomplete.length === 0 ? submit : undefined
        }
        previewHref={`/oneflow/my-forms/induction/${form.id}/preview?mode=draft`}
        printHref={`/oneflow/my-forms/induction/${form.id}/preview?mode=print`}
        busy={busy}
        extra={
          session?.role === "Admin" ? (
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950"
              onClick={() => {
                const r = service.populateInductionDemo(session, formId);
                setBanner(
                  r.ok
                    ? "Demo: sessions populated (declaration left unsigned)."
                    : r.error
                );
                if (r.ok) {
                  const n = normalizeForm(r.form);
                  setForm(n);
                  setSections(n.inductionSections);
                  setDeclaration(n.employeeDeclaration);
                  setSignature(n.typedSignature);
                  refresh();
                }
              }}
            >
              Populate Completed Induction Sessions
            </button>
          ) : null
        }
      />

      {banner && (
        <div className="mb-3 whitespace-pre-line rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 print:hidden">
          {banner}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-flow-line bg-white px-4 py-3 text-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">Induction progress</p>
          <p className="tabular-nums text-slate-600">
            {progress.cleared} of {progress.required} required sections completed
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-flow-accent transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {isEmployeeViewer && (
          <p className="mt-2 text-xs text-slate-500">
            Your induction presenters must complete the required sessions before
            you can submit your final acknowledgement.
          </p>
        )}
      </div>

      {employeeEditable && incomplete.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 print:hidden">
          <p className="font-semibold">
            Required sessions remaining: {incomplete.length}
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {[...new Set(incomplete.map((s) => s.sectionName))].map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      <InductionFormDocument
        form={form}
        mode="editable"
        sections={sections}
        declaration={declaration}
        signature={signature}
        canEditEmployee={employeeEditable && incomplete.length === 0}
        canEditPresenter={presenterEditable}
        onSectionChange={(id, patch) =>
          setSections((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
          )
        }
        onDeclarationChange={setDeclaration}
        onSignatureChange={setSignature}
      />

      {employeeEditable && incomplete.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 print:hidden">
          Final acknowledgement is locked until all required sessions show
          Completed or Not Required.
        </p>
      )}

      {isHr && form.formStatus !== "Completed" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 print:hidden">
          <p className="text-sm font-semibold text-amber-950">HR Review</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                service.saveInductionDraft(session!, formId, {
                  inductionSections: sections,
                });
                const r = service.reviewInductionForm(session!, formId, {
                  action: "Complete Review",
                  sections,
                  remarks: "HR review completed",
                });
                setBanner(r.ok ? "HR review completed." : r.error);
                if (r.ok) {
                  setForm(normalizeForm(r.form));
                  refresh();
                }
              }}
            >
              Complete HR Review
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950"
              onClick={() => {
                const reason = window.prompt("Correction reason?");
                if (!reason) return;
                const r = service.reviewInductionForm(session!, formId, {
                  action: "Return for Correction",
                  remarks: reason,
                  sections,
                });
                setBanner(r.ok ? "Returned for correction." : r.error);
                if (r.ok) {
                  setForm(normalizeForm(r.form));
                  refresh();
                }
              }}
            >
              Return for Correction
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 print:hidden">
        <Link href="/oneflow/my-tasks" className="text-sm text-flow-accent underline">
          Open My Tasks
        </Link>
      </p>
    </OneFlowShell>
  );
}
