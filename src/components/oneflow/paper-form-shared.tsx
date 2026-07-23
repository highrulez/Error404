"use client";

import Link from "next/link";
import { StatusChip } from "@/components/shared/status";

export type PaperFormMode =
  | "editable"
  | "draft"
  | "submitted"
  | "review"
  | "completed"
  | "print";

export function PpgLogoMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#0033A0] text-[10px] font-bold tracking-wide text-white ${className}`}
      aria-label="PPG"
    >
      PPG
    </div>
  );
}

export function CharBoxes({
  value,
  max = 12,
}: {
  value: string;
  max?: number;
}) {
  const padded = (value || "").slice(0, max).padEnd(max, " ");
  return (
    <div className="inline-flex flex-wrap gap-0.5" aria-hidden>
      {padded.split("").map((ch, i) => (
        <span
          key={i}
          className="inline-flex h-6 w-[1.15rem] items-center justify-center border border-slate-800 bg-white font-mono text-[11px] leading-none"
        >
          {ch.trim() ? ch : ""}
        </span>
      ))}
    </div>
  );
}

export function PaperCanvas({
  children,
  label = true,
}: {
  children: React.ReactNode;
  label?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[210mm]">
      {label && (
        <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-slate-400 print:hidden">
          Digital Mockup — OneFlow Prototype
        </p>
      )}
      <div className="paper-form-document border border-slate-300 bg-white px-5 py-6 shadow-md sm:px-8 sm:py-8 print:border-0 print:shadow-none">
        {children}
      </div>
    </div>
  );
}

export function FormToolbar({
  backHref,
  status,
  lastSaved,
  canEdit,
  onSave,
  onSubmit,
  previewHref,
  printHref,
  busy,
  extra,
}: {
  backHref: string;
  status: string;
  lastSaved?: string | null;
  canEdit: boolean;
  onSave?: () => void;
  onSubmit?: () => void;
  previewHref: string;
  printHref: string;
  busy?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="form-toolbar sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-flow-line bg-white/95 px-3 py-2 shadow-sm backdrop-blur print:hidden">
      <Link
        href={backHref}
        className="rounded-md border border-flow-line px-2.5 py-1.5 text-xs font-semibold text-slate-700"
      >
        ← Back to My Forms
      </Link>
      <StatusChip status={status} />
      {lastSaved && (
        <span className="text-[11px] text-slate-500">
          Last saved {new Date(lastSaved).toLocaleString()}
        </span>
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        {canEdit && onSave && (
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="rounded-md border border-flow-line px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Save Draft
          </button>
        )}
        {canEdit && onSubmit && (
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Submit Form
          </button>
        )}
        <Link
          href={previewHref}
          className="rounded-md border border-flow-line px-2.5 py-1.5 text-xs font-semibold"
        >
          Preview
        </Link>
        <Link
          href={printHref}
          className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          Print / Save as PDF
        </Link>
        {extra}
      </div>
    </div>
  );
}

export function FormStateMessage({
  title,
  detail,
  href = "/oneflow/my-forms",
}: {
  title: string;
  detail?: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-flow-line bg-white p-6 text-sm shadow-sm">
      <p className="font-semibold text-slate-800">{title}</p>
      {detail && <p className="mt-1 text-slate-500">{detail}</p>}
      <Link href={href} className="mt-3 inline-block text-flow-accent underline">
        Return to My Forms
      </Link>
    </div>
  );
}

export function SectionBar({ title }: { title: string }) {
  return (
    <div className="bg-[#0033A0] px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
      {title}
    </div>
  );
}

export function Mark({ checked }: { checked: boolean }) {
  return (
    <span className="inline-block w-4 text-center font-mono text-sm">
      {checked ? "☑" : "☐"}
    </span>
  );
}
