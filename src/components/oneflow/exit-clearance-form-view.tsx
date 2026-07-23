"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import type {
  EmployeeExitClearanceForm,
  ExitClearanceChecklistItem,
  ExitEmployeeAnswer,
} from "@/data";

const STEPS = [
  "Employee details",
  "Exit checklist",
  "Declaration",
  "Review and submit",
] as const;

function ItemRow({
  item,
  editable,
  onAnswer,
  onConditional,
}: {
  item: ExitClearanceChecklistItem;
  editable: boolean;
  onAnswer: (answer: ExitEmployeeAnswer) => void;
  onConditional: (key: string, value: string) => void;
}) {
  return (
    <div
      className={`border-b border-slate-200 py-4 ${
        item.unlockedForCorrection ? "bg-amber-50" : ""
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[48px_1fr_90px_90px_180px]">
        <div className="text-sm font-semibold text-slate-700">
          {item.sequenceNumber}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          {item.description && (
            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
          )}
          {item.unlockedForCorrection && item.confirmationRemarks && (
            <p className="mt-2 rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900">
              Correction required: {item.confirmationRemarks}
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`ans-${item.id}`}
            checked={item.employeeAnswer === "Yes"}
            disabled={!editable}
            onChange={() => onAnswer("Yes")}
          />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`ans-${item.id}`}
            checked={item.employeeAnswer === "No"}
            disabled={!editable}
            onChange={() => onAnswer("No")}
          />
          No
        </label>
        <div className="text-xs text-slate-600">
          <p className="font-semibold text-slate-500">Confirmation from</p>
          <p>{item.confirmationDepartment}</p>
        </div>
      </div>
      {item.employeeAnswer === "Yes" && item.conditionalFields.length > 0 && (
        <div className="mt-3 ml-0 md:ml-12 grid gap-2 sm:grid-cols-2">
          {item.conditionalFields.map((field) => (
            <label key={field.key} className="block text-xs font-medium text-slate-600">
              {field.label}
              {field.required ? " *" : ""}
              {field.type === "select" ? (
                <select
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                  disabled={!editable}
                  value={item.conditionalValues[field.key] || ""}
                  onChange={(e) => onConditional(field.key, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                  disabled={!editable}
                  rows={2}
                  value={item.conditionalValues[field.key] || ""}
                  onChange={(e) => onConditional(field.key, e.target.value)}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                  disabled={!editable}
                  value={item.conditionalValues[field.key] || ""}
                  onChange={(e) => onConditional(field.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      )}
      {(item.confirmationStatus !== "Not Required" ||
        item.confirmationName) && (
        <div className="mt-3 ml-0 md:ml-12 rounded border border-slate-200 bg-slate-50 p-2 text-xs">
          <p className="font-semibold">{item.confirmationDepartment}</p>
          <p>Status: {item.confirmationStatus}</p>
          {item.confirmationName && (
            <p>
              Confirmed By: {item.confirmationName} · Initial:{" "}
              {item.confirmationInitial} · Date: {item.confirmationDate || "—"}
            </p>
          )}
          {item.confirmationRemarks && !item.unlockedForCorrection && (
            <p className="text-slate-600">Remarks: {item.confirmationRemarks}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ExitClearanceFormView({ formId }: { formId: string }) {
  const { session } = useAuth();
  const { ready, service, refresh } = useData();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EmployeeExitClearanceForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submittedOk, setSubmittedOk] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    const opened = service.openExitClearanceForm(session, formId);
    if (!opened.ok) {
      setError(opened.error);
      return;
    }
    setForm(opened.form);
    refresh();
  }, [ready, session, formId, service, refresh]);

  const progress = useMemo(
    () => (form ? service.getExitFormProgress(form.id) : null),
    [form, service]
  );

  if (!session) return <p className="text-sm text-slate-500">Sign in required.</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        {error}
        <div className="mt-3">
          <Link href="/oneflow/my-tasks" className="text-flow-accent underline">
            Back to My Tasks
          </Link>
        </div>
      </div>
    );
  }
  if (!form) return <p className="text-sm text-slate-500">Loading form…</p>;

  const employeeEditable =
    (form.formStatus === "Sent" ||
      form.formStatus === "Opened" ||
      form.formStatus === "Draft" ||
      form.formStatus === "Returned for Correction") &&
    (session.role === "OFFBOARDING_EMPLOYEE" ||
      session.role === "Admin");

  const itemEditable = (item: ExitClearanceChecklistItem) => {
    if (!employeeEditable) return false;
    if (form.formStatus === "Returned for Correction") {
      return item.unlockedForCorrection;
    }
    return true;
  };

  const patch = () => ({
    personalEmail: form.personalEmail,
    contactNumber: form.contactNumber,
    employeeDeclarationConfirmed: form.employeeDeclarationConfirmed,
    employeeTypedSignature: form.employeeTypedSignature,
    checklistItems: form.checklistItems.map((i) => ({
      id: i.id,
      employeeAnswer: i.employeeAnswer,
      conditionalValues: i.conditionalValues,
    })),
  });

  const updateItem = (
    id: string,
    updater: (item: ExitClearanceChecklistItem) => ExitClearanceChecklistItem
  ) => {
    setForm({
      ...form,
      checklistItems: form.checklistItems.map((i) =>
        i.id === id ? updater(i) : i
      ),
    });
  };

  if (submittedOk) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-950">
          Exit Clearance Form submitted
        </h2>
        <p className="mt-2 text-sm text-emerald-900">
          Your answers are now read-only. Department confirmation tasks have been
          created. You can track confirmation progress below or return later.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setSubmittedOk(false);
              setStep(1);
            }}
          >
            View confirmation progress
          </button>
          <Link
            href={`/oneflow/exit-clearance/${form.id}/print?mode=submitted`}
            className="rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-900"
          >
            Print / Save as PDF
          </Link>
          <Link
            href="/oneflow/my-tasks"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            My Assigned Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Employee Exit Clearance Form
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {form.employeeName} · {form.employeeNumber} · Last working day{" "}
            {form.lastWorkingDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={form.formStatus} />
          <Link
            href={`/oneflow/exit-clearance/${form.id}/print?mode=blank`}
            className="text-xs text-flow-accent underline"
          >
            Print view
          </Link>
        </div>
      </div>

      {progress && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-flow-line bg-white p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase text-slate-400">
              Employee submission
            </p>
            <p className="mt-1 font-semibold">{progress.employeeSubmission}</p>
          </div>
          <div className="rounded-lg border border-flow-line bg-white p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase text-slate-400">
              Department clearance
            </p>
            <p className="mt-1 font-semibold">
              {(progress.clearedCount ?? progress.confirmedCount)} of{" "}
              {form.checklistItems.length} cleared · {progress.percent}%
            </p>
            {progress.pendingDepartments.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Pending: {progress.pendingDepartments.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(idx)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              step === idx
                ? "bg-flow-accent text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      {banner && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {banner}
        </p>
      )}

      <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Employee name", form.employeeName],
              ["Employee ID", form.employeeNumber],
              ["Department", form.department],
              ["Location", form.location],
              ["Manager", form.managerName],
              ["Last working date", form.lastWorkingDate],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
            <label className="block text-xs font-semibold text-slate-600">
              Personal email *
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                disabled={!employeeEditable}
                value={form.personalEmail}
                onChange={(e) =>
                  setForm({ ...form, personalEmail: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Contact number *
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                disabled={!employeeEditable}
                value={form.contactNumber}
                onChange={(e) =>
                  setForm({ ...form, contactNumber: e.target.value })
                }
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="mb-2 hidden grid-cols-[48px_1fr_90px_90px_180px] gap-3 border-b border-slate-300 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>#</span>
              <span>Item description</span>
              <span>Yes</span>
              <span>No</span>
              <span>Confirmation needed from</span>
            </div>
            {form.checklistItems
              .slice()
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
              .map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  editable={itemEditable(item)}
                  onAnswer={(answer) =>
                    updateItem(item.id, (i) => ({
                      ...i,
                      employeeAnswer: answer,
                    }))
                  }
                  onConditional={(key, value) =>
                    updateItem(item.id, (i) => ({
                      ...i,
                      conditionalValues: {
                        ...i.conditionalValues,
                        [key]: value,
                      },
                    }))
                  }
                />
              ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={!employeeEditable}
                checked={form.employeeDeclarationConfirmed}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employeeDeclarationConfirmed: e.target.checked,
                  })
                }
              />
              <span>
                I confirm that the information provided in this Employee Exit
                Clearance Form is accurate and complete. I understand that all
                company property, documents, information, access items and
                outstanding financial matters must be cleared before my
                offboarding case can be completed.
              </span>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Typed employee name (signature) *
              <input
                className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm italic disabled:bg-slate-100"
                disabled={!employeeEditable}
                value={form.employeeTypedSignature}
                onChange={(e) =>
                  setForm({ ...form, employeeTypedSignature: e.target.value })
                }
              />
            </label>
            <p className="text-xs text-slate-500">
              Submission date:{" "}
              {form.submittedAt
                ? form.submittedAt.slice(0, 10)
                : new Date().toISOString().slice(0, 10)}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p>
              Review your answers, then submit. After submission, employee
              answers become read-only and department confirmation tasks are
              created.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
              {form.checklistItems.map((i) => (
                <li key={i.id}>
                  {i.sequenceNumber}. {i.title}: <strong>{i.employeeAnswer}</strong>
                </li>
              ))}
            </ul>
            <p>
              Signature: <em>{form.employeeTypedSignature || "—"}</em>
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            type="button"
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        )}
        {employeeEditable && (
          <button
            type="button"
            className="rounded-md border border-flow-accent px-3 py-2 text-sm font-semibold text-flow-accent"
            onClick={() => {
              const result = service.saveExitClearanceDraft(
                session,
                form.id,
                patch()
              );
              if (!result.ok) {
                setBanner(null);
                setError(result.error);
                return;
              }
              setForm(result.form);
              setBanner("Draft saved.");
              refresh();
            }}
          >
            Save Draft
          </button>
        )}
        {employeeEditable && step === STEPS.length - 1 && (
          <button
            type="button"
            className="rounded-md bg-flow-accent px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const result = service.submitExitClearanceForm(
                session,
                form.id,
                patch()
              );
              if (!result.ok) {
                setBanner(result.error);
                return;
              }
              setForm(result.form);
              setSubmittedOk(true);
              refresh();
            }}
          >
            Submit Form
          </button>
        )}
        {session.role === "Admin" && (
          <button
            type="button"
            className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
            onClick={() => {
              const result = service.populateSampleExitAnswers(
                session,
                form.id
              );
              if (result.ok) {
                setForm(result.form);
                setBanner("Sample answers populated (demo).");
                refresh();
              }
            }}
          >
            Populate Sample Answers (Demo)
          </button>
        )}
      </div>
    </div>
  );
}
