"use client";

import type { SecurityAccessCardApplication } from "@/data/access-card-types";
import { ACCESS_CARD_LOCATIONS } from "@/data/access-card-types";
import {
  CharBoxes,
  Mark,
  PaperCanvas,
  type PaperFormMode,
} from "@/components/oneflow/paper-form-shared";

export type AccessCardDraft = {
  companyNameOnCard: string;
  locationUnit: string;
  customLocation: string;
  applicantName: string;
  gender: SecurityAccessCardApplication["gender"];
  officeTelephone: string;
  mobileTelephone: string;
  nameOnCard: string;
  identityDocumentType: SecurityAccessCardApplication["identityDocumentType"];
  identityDocumentNumber: string;
  photoDataUrl: string | null;
  photoAttachmentId: string | null;
  employeeDeclarationConfirmed: boolean;
  employeeTypedSignature: string;
  officeUseOnly: SecurityAccessCardApplication["officeUseOnly"];
};

export function AccessCardFormDocument({
  form,
  draft,
  mode,
  canEditEmployee,
  canEditOffice,
  maskPin,
  fieldErrors,
  onChange,
}: {
  form: SecurityAccessCardApplication;
  draft: AccessCardDraft;
  mode: PaperFormMode;
  canEditEmployee?: boolean;
  canEditOffice?: boolean;
  maskPin?: boolean;
  fieldErrors?: Record<string, string>;
  onChange?: (patch: Partial<AccessCardDraft>) => void;
}) {
  const printLike =
    mode === "print" ||
    mode === "submitted" ||
    mode === "completed" ||
    mode === "draft" ||
    !canEditEmployee;

  const locValue =
    draft.locationUnit === "__custom__"
      ? draft.customLocation
      : draft.locationUnit;

  return (
    <PaperCanvas>
      <header className="mb-3 border-b-2 border-slate-800 pb-2 text-center">
        <p className="text-sm font-bold tracking-wide text-slate-900">
          UOA BUSINESS PARK
        </p>
        <h1 className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm">
          Appendix E – Security Access Card Application – Detail Form
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="border border-slate-800 p-2">
          <p className="mb-1 text-center text-[9px] font-semibold uppercase text-slate-600">
            Attached photo in well-fitted size of this column
          </p>
          <div className="mx-auto aspect-[3/4] w-full max-w-[120px] overflow-hidden border border-slate-400 bg-slate-100">
            {draft.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.photoDataUrl}
                alt="Applicant"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-[9px] text-slate-400">
                Photo
              </div>
            )}
          </div>
          {canEditEmployee && !printLike && (
            <div className="mt-2 space-y-1 print:hidden">
              {onChange && (
                <>
                  <button
                    type="button"
                    className="w-full rounded border border-slate-300 px-1 py-0.5 text-[10px] font-semibold"
                    onClick={() =>
                      onChange({
                        photoAttachmentId: "demo-photo",
                        photoDataUrl:
                          // lazy: parent sets DEMO via button outside often
                          draft.photoDataUrl,
                      })
                    }
                  >
                    Keep current photo
                  </button>
                </>
              )}
            </div>
          )}
          {fieldErrors?.photo && (
            <p className="mt-1 text-[10px] text-rose-600">{fieldErrors.photo}</p>
          )}
        </div>

        <div className="space-y-0 border border-slate-800 text-[11px]">
          <NumberedRow n={1} label="Company Name to be Appeared on Card (max 12)">
            {printLike || !canEditEmployee ? (
              <CharBoxes value={draft.companyNameOnCard} max={12} />
            ) : (
              <div>
                <input
                  id="acc-company"
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  maxLength={12}
                  value={draft.companyNameOnCard}
                  onChange={(e) =>
                    onChange?.({ companyNameOnCard: e.target.value })
                  }
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {draft.companyNameOnCard.length}/12
                </p>
                {fieldErrors?.companyNameOnCard && (
                  <p className="text-[10px] text-rose-600">
                    {fieldErrors.companyNameOnCard}
                  </p>
                )}
              </div>
            )}
          </NumberedRow>

          <NumberedRow n={2} label="Location / Unit Number">
            {printLike || !canEditEmployee ? (
              <span className="font-semibold">{locValue || "—"}</span>
            ) : (
              <div className="space-y-1">
                <select
                  id="acc-location"
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  value={
                    ACCESS_CARD_LOCATIONS.includes(
                      draft.locationUnit as (typeof ACCESS_CARD_LOCATIONS)[number]
                    )
                      ? draft.locationUnit
                      : draft.locationUnit
                        ? "__custom__"
                        : ""
                  }
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      onChange?.({
                        locationUnit: "__custom__",
                        customLocation: draft.customLocation || "",
                      });
                    } else {
                      onChange?.({ locationUnit: e.target.value });
                    }
                  }}
                >
                  <option value="">Select…</option>
                  {ACCESS_CARD_LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                  <option value="__custom__">Custom approved location…</option>
                </select>
                {(draft.locationUnit === "__custom__" ||
                  (!ACCESS_CARD_LOCATIONS.includes(
                    draft.locationUnit as (typeof ACCESS_CARD_LOCATIONS)[number]
                  ) &&
                    draft.locationUnit)) && (
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    placeholder="Custom location"
                    value={
                      draft.locationUnit === "__custom__"
                        ? draft.customLocation
                        : draft.locationUnit
                    }
                    onChange={(e) =>
                      onChange?.({
                        locationUnit: "__custom__",
                        customLocation: e.target.value,
                      })
                    }
                  />
                )}
                {fieldErrors?.locationUnit && (
                  <p className="text-[10px] text-rose-600">
                    {fieldErrors.locationUnit}
                  </p>
                )}
              </div>
            )}
          </NumberedRow>

          <NumberedRow n={3} label="Name of Applicant">
            {printLike || !canEditEmployee ? (
              <span className="font-semibold">{draft.applicantName}</span>
            ) : (
              <input
                id="acc-applicant"
                className="w-full rounded border border-slate-300 px-2 py-1"
                value={draft.applicantName}
                onChange={(e) => onChange?.({ applicantName: e.target.value })}
              />
            )}
          </NumberedRow>

          <NumberedRow n={4} label="Gender">
            {printLike || !canEditEmployee ? (
              <span>{draft.gender || "—"}</span>
            ) : (
              <select
                id="acc-gender"
                className="w-full rounded border border-slate-300 px-2 py-1"
                value={draft.gender}
                onChange={(e) =>
                  onChange?.({
                    gender: e.target
                      .value as SecurityAccessCardApplication["gender"],
                  })
                }
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            )}
            {fieldErrors?.gender && (
              <p className="text-[10px] text-rose-600">{fieldErrors.gender}</p>
            )}
          </NumberedRow>

          <NumberedRow n={5} label="Telephone Contact Number">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[9px] text-slate-500">Office</p>
                {printLike || !canEditEmployee ? (
                  draft.officeTelephone || "—"
                ) : (
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={draft.officeTelephone}
                    onChange={(e) =>
                      onChange?.({ officeTelephone: e.target.value })
                    }
                  />
                )}
              </div>
              <div>
                <p className="text-[9px] text-slate-500">Handphone</p>
                {printLike || !canEditEmployee ? (
                  draft.mobileTelephone || "—"
                ) : (
                  <input
                    id="acc-mobile"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={draft.mobileTelephone}
                    onChange={(e) =>
                      onChange?.({ mobileTelephone: e.target.value })
                    }
                  />
                )}
                {fieldErrors?.mobileTelephone && (
                  <p className="text-[10px] text-rose-600">
                    {fieldErrors.mobileTelephone}
                  </p>
                )}
              </div>
            </div>
          </NumberedRow>

          <NumberedRow n={6} label="Name to be Appeared on Card (max 12)">
            {printLike || !canEditEmployee ? (
              <CharBoxes value={draft.nameOnCard} max={12} />
            ) : (
              <div>
                <input
                  id="acc-namecard"
                  className="w-full rounded border border-slate-300 px-2 py-1"
                  maxLength={12}
                  value={draft.nameOnCard}
                  onChange={(e) => onChange?.({ nameOnCard: e.target.value })}
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {draft.nameOnCard.length}/12
                </p>
                {fieldErrors?.nameOnCard && (
                  <p className="text-[10px] text-rose-600">
                    {fieldErrors.nameOnCard}
                  </p>
                )}
              </div>
            )}
          </NumberedRow>

          <NumberedRow n={7} label="Identity Card or Passport Number">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[9px] text-slate-500">Document type</p>
                {printLike || !canEditEmployee ? (
                  draft.identityDocumentType || "—"
                ) : (
                  <select
                    id="acc-idtype"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={draft.identityDocumentType}
                    onChange={(e) =>
                      onChange?.({
                        identityDocumentType: e.target
                          .value as SecurityAccessCardApplication["identityDocumentType"],
                      })
                    }
                  >
                    <option value="">Select</option>
                    <option value="NRIC">NRIC</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              </div>
              <div>
                <p className="text-[9px] text-slate-500">Number</p>
                {printLike || !canEditEmployee ? (
                  draft.identityDocumentNumber || "—"
                ) : (
                  <input
                    id="acc-idnum"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={draft.identityDocumentNumber}
                    onChange={(e) =>
                      onChange?.({ identityDocumentNumber: e.target.value })
                    }
                  />
                )}
              </div>
            </div>
            {fieldErrors?.identity && (
              <p className="text-[10px] text-rose-600">{fieldErrors.identity}</p>
            )}
          </NumberedRow>
        </div>
      </div>

      <div className="mt-4 border border-slate-800 p-3 text-xs">
        <p className="font-semibold">
          I hereby confirm that the above information given is complete and true.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {printLike || !canEditEmployee ? (
            <span>
              <Mark checked={draft.employeeDeclarationConfirmed} /> Declaration
            </span>
          ) : (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.employeeDeclarationConfirmed}
                onChange={(e) =>
                  onChange?.({
                    employeeDeclarationConfirmed: e.target.checked,
                  })
                }
              />
              I confirm
            </label>
          )}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            Typed signature:{" "}
            {printLike || !canEditEmployee ? (
              <em className="font-semibold">
                {draft.employeeTypedSignature || "________________"}
              </em>
            ) : (
              <input
                id="acc-signature"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                value={draft.employeeTypedSignature}
                onChange={(e) =>
                  onChange?.({ employeeTypedSignature: e.target.value })
                }
                placeholder="Type full name as signature"
              />
            )}
          </div>
          <div>
            Date:{" "}
            {form.submittedAt?.slice(0, 10) ||
              (printLike ? "________" : new Date().toISOString().slice(0, 10))}
          </div>
        </div>
      </div>

      <div className="mt-4 border-2 border-dashed border-slate-700 p-3 text-xs">
        <p className="mb-2 font-bold uppercase tracking-wide">
          For Office Use Only
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["cardNumber", "Card Number"],
              ["pin", "PIN"],
              ["activationDate", "Activation Date"],
              ["expiryDate", "Expiry Date"],
              ["receiptNumber", "Receipt Number"],
              ["administrationRemarks", "Administration Remarks"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[9px] uppercase text-slate-500">{label}</span>
              {canEditOffice && !printLike ? (
                <input
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1"
                  value={draft.officeUseOnly[key]}
                  onChange={(e) =>
                    onChange?.({
                      officeUseOnly: {
                        ...draft.officeUseOnly,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              ) : (
                <p className="mt-0.5 font-semibold">
                  {key === "pin" && maskPin
                    ? draft.officeUseOnly.pin
                      ? "••••"
                      : "—"
                    : draft.officeUseOnly[key] || "—"}
                </p>
              )}
            </label>
          ))}
        </div>
        {(form.reviewedBy || form.reviewedAt) && (
          <p className="mt-2 text-[10px] text-slate-500">
            Reviewed by {form.reviewedBy || "—"}
            {form.reviewedAt ? ` · ${form.reviewedAt.slice(0, 10)}` : ""}
          </p>
        )}
      </div>
    </PaperCanvas>
  );
}

function NumberedRow({
  n,
  label,
  children,
}: {
  n: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] border-b border-slate-300 last:border-b-0">
      <div className="flex items-start justify-center border-r border-slate-300 bg-slate-50 py-2 text-xs font-bold">
        {n}.
      </div>
      <div className="px-2 py-2">
        <p className="mb-1 text-[10px] font-semibold text-slate-700">{label}</p>
        {children}
      </div>
    </div>
  );
}
