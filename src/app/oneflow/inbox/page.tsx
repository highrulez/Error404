"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDateTime } from "@/lib/utils";
import { RESPONSIBLE_TEAMS } from "@/data";
import type { MockEmailAttachment } from "@/data/exit-clearance-types";

function attachmentPreviewHref(att: MockEmailAttachment): string {
  if (att.kind === "induction-checklist") {
    return `/oneflow/my-forms/induction/${att.formId}/preview?mode=draft`;
  }
  if (att.kind === "access-card-application") {
    return `/oneflow/my-forms/access-card/${att.formId}/preview?mode=draft`;
  }
  if (att.kind === "first-day-guide") {
    return `/oneflow/my-onboarding/${att.formId}`;
  }
  const mode =
    att.kind === "exit-clearance-completed"
      ? "completed"
      : att.kind === "exit-clearance-submitted"
        ? "submitted"
        : "blank";
  return `/oneflow/exit-clearance/${att.formId}/print?mode=${mode}`;
}

function attachmentOpenHref(att: MockEmailAttachment): string {
  if (att.kind === "induction-checklist") {
    return `/oneflow/my-forms/induction/${att.formId}`;
  }
  if (att.kind === "access-card-application") {
    return `/oneflow/my-forms/access-card/${att.formId}`;
  }
  if (att.kind === "first-day-guide") {
    return `/oneflow/tasks/tsk-alicia-first-day`;
  }
  return `/oneflow/exit-clearance/${att.formId}`;
}

function attachmentDownloadHref(att: MockEmailAttachment): string {
  if (att.kind === "induction-checklist") {
    return `/oneflow/my-forms/induction/${att.formId}/preview?mode=print&print=1`;
  }
  if (att.kind === "access-card-application") {
    return `/oneflow/my-forms/access-card/${att.formId}/preview?mode=print&print=1`;
  }
  if (att.kind === "first-day-guide") {
    return `/oneflow/my-onboarding/${att.formId}`;
  }
  return `/oneflow/exit-clearance/${att.formId}/print?mode=blank`;
}

export default function MockInboxPage() {
  return (
    <Suspense fallback={null}>
      <MockInboxContent />
    </Suspense>
  );
}

function MockInboxContent() {
  const searchParams = useSearchParams();
  const initialSelected = searchParams.get("selected");
  const { session } = useAuth();
  const { ready, store, service, refresh } = useData();
  const [q, setQ] = useState("");
  const [employeeId, setEmployeeId] = useState("all");
  const [team, setTeam] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);

  useEffect(() => {
    if (initialSelected) setSelectedId(initialSelected);
  }, [initialSelected]);

  const emails = useMemo(() => {
    if (!session || !ready) return [];
    return service.listEmailsForUser(session);
  }, [session, ready, service, store.mockEmails]);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      if (employeeId !== "all" && e.employeeId !== employeeId) return false;
      if (team !== "all" && e.responsibleTeam !== team) return false;
      const hay = `${e.subject} ${e.to} ${e.from}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [emails, employeeId, team, q]);

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0];
  const unread = emails.filter((e) => e.status === "Unread").length;

  if (!session) return null;

  return (
    <OneFlowShell
      title="Mock Inbox"
      subtitle="Audit channel for workflow notifications — SES delivery is optional via Admin → Email Delivery"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Unread: <strong>{unread}</strong> · Showing {filtered.length} messages
        </p>
        {session.role === "Admin" && (
          <button
            type="button"
            className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              if (confirm("Clear all mock emails?")) {
                service.resetDemoEmails();
                refresh();
              }
            }}
          >
            Reset demo emails
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          placeholder="Search subject or recipient…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          <option value="all">All employees</option>
          {store.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        >
          <option value="all">All teams</option>
          {RESPONSIBLE_TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-[480px] overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm lg:grid-cols-[320px_1fr]">
        <div className="border-b border-flow-line lg:border-b-0 lg:border-r">
          <div className="border-b border-flow-line bg-[#f3f2f1] px-3 py-2 text-xs font-semibold text-slate-600">
            Focused Inbox (prototype)
          </div>
          <ul className="max-h-[520px] overflow-auto divide-y divide-flow-line">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-3 text-left hover:bg-sky-50 ${
                    selected?.id === e.id ? "bg-sky-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(e.id);
                    if (e.status === "Unread") {
                      service.markEmailRead(e.id, true);
                      refresh();
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        e.status === "Unread" ? "font-bold" : "font-medium"
                      }`}
                    >
                      {e.from}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatDateTime(e.sentAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-700">
                    {e.subject}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <StatusChip status={e.status} />
                    {e.deliveryStatus && (
                      <StatusChip status={e.deliveryStatus} />
                    )}
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-6 text-sm text-slate-400">
                No mock emails yet. Admin: open a case and click Run Mock
                Automation.
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-col">
          {selected ? (
            <>
              <div className="border-b border-flow-line px-5 py-4">
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  From {selected.from} · To {selected.to}
                  {selected.cc.length ? ` · Cc ${selected.cc.join(", ")}` : ""}
                  {selected.mappedRecipientMasked
                    ? ` · SES ${selected.mappedRecipientMasked}`
                    : ""}
                  {selected.providerMessageId
                    ? ` · Msg ${selected.providerMessageId}`
                    : ""}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDateTime(selected.sentAt)} · {selected.responsibleTeam}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-flow-line px-3 py-1 text-xs font-semibold"
                    onClick={() => {
                      service.markEmailRead(
                        selected.id,
                        selected.status !== "Unread"
                      );
                      refresh();
                    }}
                  >
                    Mark {selected.status === "Unread" ? "read" : "unread"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                    onClick={() => {
                      service.deleteEmail(selected.id);
                      setSelectedId(null);
                      refresh();
                    }}
                  >
                    Delete
                  </button>
                  <Link
                    href="/oneflow/my-tasks"
                    className="rounded-md bg-flow-accent px-3 py-1 text-xs font-semibold text-white"
                  >
                    Open My Assigned Tasks
                  </Link>
                </div>
              </div>
              <div
                className="flex-1 overflow-auto px-5 py-4 text-sm"
                dangerouslySetInnerHTML={{ __html: selected.htmlBody }}
              />
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="border-t border-flow-line px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Attachments (mock)
                  </p>
                  <div className="mt-2 space-y-2">
                    {selected.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          📄 {att.fileName}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Mock PDF attachment ·{" "}
                          {att.openedAt
                            ? `Opened ${formatDateTime(att.openedAt)}`
                            : "Not opened"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={attachmentPreviewHref(att)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                          >
                            Preview
                          </Link>
                          <Link
                            href={attachmentOpenHref(att)}
                            className="rounded-md bg-flow-accent px-2 py-1 text-xs font-semibold text-white"
                          >
                            Open and Complete Form
                          </Link>
                          <Link
                            href={attachmentDownloadHref(att)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                          >
                            Download Mock Copy
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a message
            </div>
          )}
        </div>
      </div>
    </OneFlowShell>
  );
}
