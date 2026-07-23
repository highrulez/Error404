"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import type { ChecklistTask, Employee } from "@/data";
import type {
  InductionChecklistForm,
  InductionItemCoverage,
  InductionSection,
} from "@/data/induction-types";
import { resolveInductionSectionId } from "@/data/induction-types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-40 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export function InductionPresenterPanel({
  task,
  employee,
  form,
  onDone,
}: {
  task: ChecklistTask;
  employee?: Employee;
  form: InductionChecklistForm;
  onDone: (message: string) => void;
}) {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const closed = task.status === "Completed" || task.status === "Cancelled";

  const section = useMemo(() => {
    const sid = task.relatedSectionId || "";
    return form.inductionSections.find(
      (s) => resolveInductionSectionId(s) === sid || s.id === sid
    );
  }, [form, task.relatedSectionId]);

  const [remarks, setRemarks] = useState(
    section?.presenterRemarks || section?.remarks || ""
  );
  const [completedOn, setCompletedOn] = useState(
    section?.completedOn || new Date().toISOString().slice(0, 10)
  );
  const [pastReason, setPastReason] = useState("");
  const [coverage, setCoverage] = useState<
    Record<string, InductionItemCoverage>
  >(() => {
    const map: Record<string, InductionItemCoverage> = {};
    for (const item of section?.items || []) {
      map[item.id] = item.coverage || "Pending";
    }
    return map;
  });

  if (!session || !section) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Linked induction section could not be loaded. Use Repair Induction
        Workflow from Admin demo controls.
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const isPast = completedOn < today;

  const setItem = (id: string, value: InductionItemCoverage) => {
    setCoverage((prev) => ({ ...prev, [id]: value }));
  };

  const markAllCovered = () => {
    const next: Record<string, InductionItemCoverage> = {};
    for (const item of section.items) {
      next[item.id] = "Covered";
    }
    setCoverage(next);
  };

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Induction session — {section.sectionName}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Confirm that all applicable items in this section were covered.
          </p>
        </div>
        <StatusChip status={section.status || "Pending"} />
      </div>

      <dl className="grid gap-1.5 sm:grid-cols-2">
        <Row
          label="Employee"
          value={form.employeeName || employee?.fullName || "—"}
        />
        <Row
          label="Employee ID"
          value={employee?.employeeNumber || form.employeeId}
        />
        <Row label="Job title" value={employee?.role || form.jobTitle || "—"} />
        <Row
          label="Department"
          value={form.department || employee?.department || "—"}
        />
        <Row
          label="Start date"
          value={employee?.startDate ? formatDate(employee.startDate) : "—"}
        />
        <Row label="Section" value={section.sectionName} />
        <Row
          label="Completed On"
          value={
            section.completedOn
              ? formatDate(section.completedOn)
              : closed
                ? "—"
                : "Auto-set on complete"
          }
        />
        <Row
          label="Presenter"
          value={
            section.presenterName
              ? `${section.presenterName} (${section.presenterInitials || "—"})`
              : session.name
          }
        />
      </dl>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Section items
          </h3>
          {!closed && (
            <button
              type="button"
              className="text-xs font-semibold text-flow-accent underline"
              onClick={markAllCovered}
            >
              Mark all Covered
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {section.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="text-slate-800">{item.label}</span>
              {closed ? (
                <StatusChip status={item.coverage || coverage[item.id] || "Covered"} />
              ) : (
                <select
                  className="rounded border border-flow-line bg-white px-2 py-1 text-xs"
                  value={coverage[item.id] || "Pending"}
                  onChange={(e) =>
                    setItem(item.id, e.target.value as InductionItemCoverage)
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Covered">Covered</option>
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                </select>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!closed && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-500">Completion date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2"
              value={completedOn}
              onChange={(e) => setCompletedOn(e.target.value)}
            />
          </label>
          {isPast && (
            <label className="block text-sm">
              <span className="text-slate-500">Reason for past date</span>
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2"
                value={pastReason}
                onChange={(e) => setPastReason(e.target.value)}
                placeholder="Required for backdated completion"
              />
            </label>
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-500">Presenter remarks</span>
            <textarea
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </label>
        </div>
      )}

      {!closed && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-flow-line px-4 py-2 text-sm font-semibold"
            onClick={() => {
              const r = service.startInductionSession(session, task.id);
              onDone(r.ok ? "Session started." : r.error);
              if (r.ok) refresh();
            }}
          >
            Start Session
          </button>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const r = service.completeInductionSession(session, task.id, {
                completedOn,
                remarks,
                pastDateReason: pastReason,
                itemCoverage: Object.fromEntries(
                  Object.entries(coverage).filter(
                    ([, v]) =>
                      v === "Covered" ||
                      v === "Not Applicable" ||
                      v === "Follow-up Required"
                  )
                ) as Record<
                  string,
                  "Covered" | "Not Applicable" | "Follow-up Required"
                >,
              });
              onDone(
                r.ok
                  ? `Session completed. Completed On set to ${completedOn}.`
                  : r.error
              );
              if (r.ok) refresh();
            }}
          >
            Mark Session Completed
          </button>
          <button
            type="button"
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950"
            onClick={() => {
              const reason =
                remarks.trim() ||
                window.prompt("Reason for rescheduling?") ||
                "";
              if (!reason.trim()) {
                onDone("Reschedule reason is required.");
                return;
              }
              const r = service.returnInductionSessionForReschedule(
                session,
                task.id,
                reason
              );
              onDone(r.ok ? "Returned for rescheduling." : r.error);
              if (r.ok) refresh();
            }}
          >
            Return for Rescheduling
          </button>
        </div>
      )}

      <Link
        href={`/oneflow/my-forms/induction/${form.id}/preview?mode=draft`}
        className="inline-block text-xs font-semibold text-flow-accent underline"
      >
        View checklist preview →
      </Link>
    </div>
  );
}

/** Re-export type helper for callers that need section typing */
export type { InductionSection };
