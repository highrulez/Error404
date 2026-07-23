"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import {
  AccessCardFormDocument,
  type AccessCardDraft,
} from "@/components/oneflow/access-card-form-document";
import {
  FormStateMessage,
  FormToolbar,
} from "@/components/oneflow/paper-form-shared";
import { ACCESS_CARD_LOCATIONS } from "@/data/access-card-types";
import type { SecurityAccessCardApplication } from "@/data/access-card-types";
import { DEMO_PHOTO_DATA_URL } from "@/data/access-card-seed";
import { validateAccessCardForSubmit } from "@/data/access-card-ops";

function toDraft(form: SecurityAccessCardApplication): AccessCardDraft {
  const known = ACCESS_CARD_LOCATIONS.includes(
    form.locationUnit as (typeof ACCESS_CARD_LOCATIONS)[number]
  );
  return {
    companyNameOnCard: form.companyNameOnCard,
    locationUnit: known ? form.locationUnit : form.locationUnit ? "__custom__" : "",
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
    officeUseOnly: { ...form.officeUseOnly },
  };
}

function resolvedLocation(draft: AccessCardDraft): string {
  return draft.locationUnit === "__custom__"
    ? draft.customLocation
    : draft.locationUnit;
}

function toPatch(draft: AccessCardDraft) {
  return {
    companyNameOnCard: draft.companyNameOnCard,
    locationUnit: resolvedLocation(draft),
    applicantName: draft.applicantName,
    gender: draft.gender,
    officeTelephone: draft.officeTelephone,
    mobileTelephone: draft.mobileTelephone,
    nameOnCard: draft.nameOnCard,
    identityDocumentType: draft.identityDocumentType,
    identityDocumentNumber: draft.identityDocumentNumber,
    photoDataUrl: draft.photoDataUrl,
    photoAttachmentId: draft.photoAttachmentId,
    employeeDeclarationConfirmed: draft.employeeDeclarationConfirmed,
    employeeTypedSignature: draft.employeeTypedSignature,
  };
}

function fieldErrorsFromMessage(msg: string): Record<string, string> {
  const lower = msg.toLowerCase();
  if (lower.includes("company")) return { companyNameOnCard: msg };
  if (lower.includes("location")) return { locationUnit: msg };
  if (lower.includes("gender")) return { gender: msg };
  if (lower.includes("handphone") || lower.includes("mobile"))
    return { mobileTelephone: msg };
  if (lower.includes("name on card")) return { nameOnCard: msg };
  if (lower.includes("identity")) return { identity: msg };
  if (lower.includes("photo")) return { photo: msg };
  if (lower.includes("declaration") || lower.includes("signature"))
    return { signature: msg };
  return { form: msg };
}

function scrollToFirstError(errors: Record<string, string>) {
  const map: Record<string, string> = {
    companyNameOnCard: "acc-company",
    locationUnit: "acc-location",
    gender: "acc-gender",
    mobileTelephone: "acc-mobile",
    nameOnCard: "acc-namecard",
    identity: "acc-idtype",
    photo: "acc-photo-actions",
    signature: "acc-signature",
  };
  const key = Object.keys(errors)[0];
  const id = key ? map[key] : undefined;
  if (!id) return;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function AccessCardFormView({ formId }: { formId: string }) {
  const { session } = useAuth();
  const { ready, service, refresh } = useData();
  const [form, setForm] = useState<SecurityAccessCardApplication | null>(null);
  const [draft, setDraft] = useState<AccessCardDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "notfound" | "unauthorized"
  >("loading");

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setLoadState("unauthorized");
      setError("You do not have permission to view this form.");
      return;
    }
    setLoadState("loading");
    try {
      const existing = service.getAccessCardForm(formId);
      if (!existing) {
        console.warn("[OneFlow] Access card form not found", formId);
        setLoadState("notfound");
        setError("This onboarding form could not be found.");
        return;
      }
      const opened = service.openAccessCardForm(session, formId);
      if (!opened.ok) {
        setLoadState("unauthorized");
        setError(opened.error || "You do not have permission to view this form.");
        return;
      }
      setForm(opened.form);
      setDraft(toDraft(opened.form));
      setLoadState("ready");
      refresh();
    } catch (err) {
      console.error("[OneFlow] Access card form init failed", err);
      setLoadState("notfound");
      setError(
        "We could not prepare this form. Please return to My Forms and try again."
      );
    }
  }, [ready, session, formId, service, refresh]);

  const isAdminTeam =
    session?.role === "ADMINISTRATION" || session?.role === "Admin";
  const isEmployeeOwner =
    session &&
    form &&
    (session.role === "ONBOARDING_EMPLOYEE" ||
      session.role === "OFFBOARDING_EMPLOYEE" ||
      session.email.toLowerCase() === form.employeeEmail.toLowerCase());

  const employeeEditable =
    Boolean(form) &&
    Boolean(isEmployeeOwner || session?.role === "Admin") &&
    ["Sent", "Opened", "Draft", "Returned for Correction"].includes(
      form!.formStatus
    );

  const officeEditable =
    Boolean(isAdminTeam) &&
    form != null &&
    [
      "Submitted",
      "Under Administration Review",
      "Approved",
      "Card Issued",
      "Returned for Correction",
      "Draft",
      "Opened",
      "Sent",
    ].includes(form.formStatus);

  const maskPin =
    Boolean(isEmployeeOwner) &&
    session?.role !== "Admin" &&
    session?.role !== "ADMINISTRATION";

  if (!session && ready) {
    return (
      <OneFlowShell title="Access Card Application">
        <FormStateMessage title="You do not have permission to view this form." />
      </OneFlowShell>
    );
  }

  if (!ready || loadState === "loading") {
    return (
      <OneFlowShell title="Access Card Application">
        <p className="text-sm text-slate-500">Loading your form...</p>
      </OneFlowShell>
    );
  }

  if (loadState === "unauthorized") {
    return (
      <OneFlowShell title="Access Card Application">
        <FormStateMessage
          title="You do not have permission to view this form."
          detail={error || undefined}
        />
      </OneFlowShell>
    );
  }

  if (loadState !== "ready" || !form || !draft) {
    return (
      <OneFlowShell title="Access Card Application">
        <FormStateMessage
          title={error || "This onboarding form could not be found."}
        />
      </OneFlowShell>
    );
  }

  const save = () => {
    setBusy(true);
    const r = service.saveAccessCardDraft(session!, formId, toPatch(draft));
    setBanner(r.ok ? "Draft saved." : r.error);
    if (r.ok) {
      setForm(r.form);
      setDraft(toDraft(r.form));
      setFieldErrors({});
      refresh();
    }
    setBusy(false);
  };

  const submit = () => {
    const candidate = {
      ...form,
      ...toPatch(draft),
      locationUnit: resolvedLocation(draft),
    };
    const err = validateAccessCardForSubmit(candidate);
    if (err) {
      const fe = fieldErrorsFromMessage(err);
      setFieldErrors(fe);
      setBanner(err);
      scrollToFirstError(fe);
      return;
    }
    setBusy(true);
    const r = service.submitAccessCardForm(session!, formId, toPatch(draft));
    setBanner(r.ok ? "Submitted to Administration." : r.error);
    if (r.ok) {
      setForm(r.form);
      setDraft(toDraft(r.form));
      setFieldErrors({});
      refresh();
    } else if (r.error) {
      const fe = fieldErrorsFromMessage(r.error);
      setFieldErrors(fe);
      scrollToFirstError(fe);
    }
    setBusy(false);
  };

  return (
    <OneFlowShell
      title="UOA Security Access Card Application"
      subtitle={`${form.employeeName} · Detail Form`}
    >
      <FormToolbar
        backHref="/oneflow/my-forms"
        status={form.formStatus}
        lastSaved={form.updatedAt}
        canEdit={employeeEditable}
        onSave={employeeEditable ? save : undefined}
        onSubmit={employeeEditable ? submit : undefined}
        previewHref={`/oneflow/my-forms/access-card/${form.id}/preview?mode=draft`}
        printHref={`/oneflow/my-forms/access-card/${form.id}/preview?mode=print`}
        busy={busy}
        extra={
          session?.role === "Admin" ? (
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950"
              onClick={() => {
                const r = service.populateAccessCardDemo(session, formId);
                setBanner(r.ok ? "Demo access card data populated." : r.error);
                if (r.ok) {
                  setForm(r.form);
                  setDraft(toDraft(r.form));
                  refresh();
                }
              }}
            >
              Populate Access Card Demo Data
            </button>
          ) : null
        }
      />

      {banner && (
        <div className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 print:hidden">
          {banner}
        </div>
      )}

      {employeeEditable && (
        <div
          id="acc-photo-actions"
          className="mb-3 flex flex-wrap gap-2 print:hidden"
        >
          <button
            type="button"
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      photoAttachmentId: "demo-photo",
                      photoDataUrl: DEMO_PHOTO_DATA_URL,
                    }
                  : d
              )
            }
          >
            Use Demo Photo
          </button>
          <label className="cursor-pointer rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold">
            Upload mock photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          photoAttachmentId: file.name,
                          photoDataUrl: String(reader.result),
                        }
                      : d
                  );
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs"
            onClick={() =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      photoAttachmentId: null,
                      photoDataUrl: null,
                    }
                  : d
              )
            }
          >
            Remove Photo
          </button>
        </div>
      )}

      <AccessCardFormDocument
        form={form}
        draft={draft}
        mode="editable"
        canEditEmployee={employeeEditable}
        canEditOffice={officeEditable}
        maskPin={maskPin}
        fieldErrors={fieldErrors}
        onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
      />

      {isAdminTeam && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 print:hidden">
          <p className="text-sm font-semibold text-amber-950">
            Administration Review
          </p>
          <p className="mt-1 text-xs text-amber-900/80">
            Edit office-use fields on the form, then choose an action.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const r = service.reviewAccessCardForm(session!, formId, {
                  action: "Approve",
                  officeUseOnly: draft.officeUseOnly,
                });
                setBanner(r.ok ? "Application approved." : r.error);
                if (r.ok) {
                  setForm(r.form);
                  setDraft(toDraft(r.form));
                  refresh();
                }
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-semibold"
              onClick={() => {
                const r = service.reviewAccessCardForm(session!, formId, {
                  action: "Mark Card Issued",
                  officeUseOnly: draft.officeUseOnly,
                });
                setBanner(r.ok ? "Card marked as issued." : r.error);
                if (r.ok) {
                  setForm(r.form);
                  setDraft(toDraft(r.form));
                  refresh();
                }
              }}
            >
              Mark Card Issued
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950"
              onClick={() => {
                const reason = window.prompt("Correction reason?");
                if (!reason) return;
                const r = service.reviewAccessCardForm(session!, formId, {
                  action: "Return for Correction",
                  remarks: reason,
                });
                setBanner(r.ok ? "Returned for correction." : r.error);
                if (r.ok) {
                  setForm(r.form);
                  setDraft(toDraft(r.form));
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
