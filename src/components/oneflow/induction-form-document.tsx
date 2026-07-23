"use client";

import type { InductionChecklistForm, InductionSection } from "@/data/induction-types";
import {
  Mark,
  PaperCanvas,
  PpgLogoMark,
  SectionBar,
  type PaperFormMode,
} from "@/components/oneflow/paper-form-shared";

export function InductionFormDocument({
  form,
  mode,
  sections,
  declaration,
  signature,
  onSectionChange,
  onDeclarationChange,
  onSignatureChange,
  canEditEmployee,
  canEditPresenter,
  maskSensitive = false,
}: {
  form: InductionChecklistForm;
  mode: PaperFormMode;
  sections: InductionSection[];
  declaration: boolean;
  signature: string;
  onSectionChange?: (id: string, patch: Partial<InductionSection>) => void;
  onDeclarationChange?: (v: boolean) => void;
  onSignatureChange?: (v: string) => void;
  canEditEmployee?: boolean;
  canEditPresenter?: boolean;
  maskSensitive?: boolean;
}) {
  const printLike =
    mode === "print" ||
    mode === "submitted" ||
    mode === "completed" ||
    mode === "draft" ||
    !canEditEmployee;

  void maskSensitive;

  return (
    <PaperCanvas>
      <header className="mb-4 flex items-start gap-3 border-b-2 border-[#0033A0] pb-3">
        <PpgLogoMark />
        <div className="flex-1">
          <h1 className="text-base font-bold uppercase tracking-wide text-slate-900 sm:text-lg">
            Induction Checklist for New Employees
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            PPG Coatings (Malaysia) Sdn. Bhd. · Human Resources
          </p>
        </div>
      </header>

      <div className="mb-4 grid gap-2 border border-slate-800 text-xs sm:grid-cols-3">
        <FieldCell label="Name" value={form.employeeName} />
        <FieldCell label="Job Title" value={form.jobTitle} />
        <FieldCell label="Department" value={form.department} />
      </div>

      <div className="mb-4 rounded border border-slate-300 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
        <p className="mb-1 font-semibold text-slate-900">Instructions</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            You MUST attend all scheduled induction programs held by the various
            SBU/departments.
          </li>
          <li>
            After each induction session, please ensure that the checklist is
            duly signed by the appropriate presenter.
          </li>
          <li>
            All completed induction checklist forms must be returned to Human
            Resources for documentation.
          </li>
          <li>
            There is no deviation from this process. If assistance is required,
            please inform Human Resources immediately.
          </li>
        </ol>
        <p className="mt-2 italic text-slate-600">
          Note: Non-exempt employees are not required to attend Concur and IT
          Induction unless their job nature requires access to IT and Concur.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 px-2 py-1.5 text-left font-semibold">
                Induction Item
              </th>
              <th className="w-28 border border-slate-800 px-2 py-1.5 text-left font-semibold">
                Completed On
              </th>
              <th className="w-44 border border-slate-800 px-2 py-1.5 text-left font-semibold">
                Presenter Signature
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                printLike={printLike || !canEditPresenter}
                canEditPresenter={Boolean(canEditPresenter)}
                onChange={(patch) => onSectionChange?.(section.id, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked view */}
      <div className="mt-4 space-y-3 sm:hidden print:hidden">
        {sections.map((section) => (
          <div key={`m-${section.id}`} className="border border-slate-300">
            <SectionBar
              title={`${section.sectionName}${
                section.required === false ? " (optional)" : ""
              }`}
            />
            <ul className="list-disc space-y-1 px-3 py-2 text-[11px]">
              {section.items.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-slate-200 px-3 py-2 text-[11px]">
              <p>
                Completed: {section.completedOn || "—"} · Presenter:{" "}
                {section.presenterName || "—"} ({section.presenterInitials || "—"})
              </p>
              <p>
                Status: {section.presenterSignatureStatus}
                {section.presenterSignatureStatus === "Signed" && (
                  <span className="ml-1 rounded bg-emerald-100 px-1 text-emerald-800">
                    Confirmed
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-slate-800 p-3 text-xs">
        <p className="font-semibold">Employee declaration</p>
        <p className="mt-2">
          I, <strong>{form.employeeName}</strong>, confirm that I have gone
          through the above orientation.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {printLike || !canEditEmployee ? (
            <span>
              <Mark checked={declaration} /> Acknowledged
            </span>
          ) : (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={declaration}
                onChange={(e) => onDeclarationChange?.(e.target.checked)}
              />
              I acknowledge and confirm
            </label>
          )}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Employee typed signature:</span>{" "}
            {printLike || !canEditEmployee ? (
              <em className="font-semibold">
                {signature || "________________"}
              </em>
            ) : (
              <input
                className="mt-1 w-full rounded border border-slate-400 px-2 py-1"
                value={signature}
                onChange={(e) => onSignatureChange?.(e.target.value)}
                placeholder="Type full name"
              />
            )}
          </div>
          <div>
            <span className="text-slate-500">Acknowledgement date:</span>{" "}
            {form.acknowledgementDate ||
              (form.submittedAt ? form.submittedAt.slice(0, 10) : "________")}
          </div>
          <div>
            <span className="text-slate-500">HR received date:</span>{" "}
            {form.hrReceivedDate || "________"}
          </div>
          <div>
            <span className="text-slate-500">HR reviewer:</span>{" "}
            {form.reviewedBy || "________"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">HR remarks:</span>{" "}
            {form.hrRemarks || "—"}
          </div>
        </div>
      </div>
    </PaperCanvas>
  );
}

function FieldCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-300 px-2 py-1.5 sm:border-b-0 sm:border-r last:sm:border-r-0">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionBlock({
  section,
  printLike,
  canEditPresenter,
  onChange,
}: {
  section: InductionSection;
  printLike: boolean;
  canEditPresenter: boolean;
  onChange: (patch: Partial<InductionSection>) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={3} className="border border-slate-800 p-0">
          <SectionBar
            title={`${section.sectionName}${
              section.required === false ? " — Optional / job-profile based" : ""
            }`}
          />
        </td>
      </tr>
      <tr className="align-top">
        <td className="border border-slate-800 px-2 py-2">
          <ul className="list-disc space-y-0.5 pl-4">
            {section.items.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
          {section.remarks && (
            <p className="mt-1 text-[10px] italic text-slate-500">
              Remarks: {section.remarks}
            </p>
          )}
        </td>
        <td className="border border-slate-800 px-2 py-2">
          {printLike || !canEditPresenter ? (
            <div>
              <p className="font-semibold">
                {section.completedOn
                  ? new Date(section.completedOn + "T12:00:00").toLocaleDateString(
                      "en-GB",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )
                  : "—"}
              </p>
              {section.status === "Not Required" && (
                <p className="text-[10px] text-slate-500">Not Required</p>
              )}
            </div>
          ) : (
            <input
              type="date"
              className="w-full rounded border border-slate-300 px-1 py-0.5"
              value={section.completedOn || ""}
              onChange={(e) => onChange({ completedOn: e.target.value })}
            />
          )}
        </td>
        <td className="border border-slate-800 px-2 py-2">
          {printLike || !canEditPresenter ? (
            <div>
              <p className="font-semibold">{section.presenterName || "—"}</p>
              <p className="text-[10px]">
                Initials: {section.presenterInitials || "—"}
              </p>
              <p className="mt-1">
                {section.status === "Completed" ||
                section.presenterSignatureStatus === "Signed" ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Completed
                  </span>
                ) : section.status === "Not Required" ? (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    Not Required
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Not Signed</span>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <input
                className="w-full rounded border border-slate-300 px-1 py-0.5"
                placeholder="Presenter name"
                value={section.presenterName}
                onChange={(e) => onChange({ presenterName: e.target.value })}
              />
              <input
                className="w-full rounded border border-slate-300 px-1 py-0.5"
                placeholder="Initials"
                value={section.presenterInitials}
                onChange={(e) => onChange({ presenterInitials: e.target.value })}
              />
              <select
                className="w-full rounded border border-slate-300 px-1 py-0.5"
                value={section.presenterSignatureStatus}
                onChange={(e) =>
                  onChange({
                    presenterSignatureStatus: e.target
                      .value as InductionSection["presenterSignatureStatus"],
                  })
                }
              >
                <option value="Not Signed">Not Signed</option>
                <option value="Signed">Signed</option>
                <option value="Not Required">Not Required</option>
              </select>
              <textarea
                className="w-full rounded border border-slate-300 px-1 py-0.5"
                rows={2}
                placeholder="Session remarks"
                value={section.remarks}
                onChange={(e) => onChange({ remarks: e.target.value })}
              />
            </div>
          )}
        </td>
      </tr>
    </>
  );
}
