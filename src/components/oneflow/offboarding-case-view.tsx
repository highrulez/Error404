"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CHECKLIST_GROUPS,
  unmetPrerequisiteTitles,
  type ChecklistTask,
  type TaskStatus,
} from "@/data";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { OffboardingDemoControls } from "@/components/oneflow/offboarding-demo-controls";
import { formatDate, formatDateTime, TASK_STATUSES } from "@/lib/utils";
import { AlertTriangle, Lock } from "lucide-react";

function groupStatusLabel(tasks: ChecklistTask[]): string {
  if (!tasks.length) return "Empty";
  if (tasks.every((t) => t.status === "Completed")) return "Completed";
  if (tasks.some((t) => t.status === "Blocked")) return "Blocked";
  const today = new Date().toISOString().slice(0, 10);
  if (
    tasks.some(
      (t) =>
        t.status === "Overdue" ||
        (t.status !== "Completed" &&
          t.status !== "Blocked" &&
          t.dueDate < today)
    )
  ) {
    return "Overdue";
  }
  if (tasks.some((t) => t.status === "In Progress")) return "In Progress";
  return "Pending";
}

function TaskCard({
  task,
  allTasks,
  onStatus,
}: {
  task: ChecklistTask;
  allTasks: ChecklistTask[];
  onStatus: (id: string, status: TaskStatus) => void;
}) {
  const unmet = unmetPrerequisiteTitles(task, allTasks);
  const isBlocked = task.status === "Blocked" || unmet.length > 0;

  return (
    <div
      className={`rounded-lg border p-2 ${
        isBlocked ? "border-amber-200 bg-amber-50" : "border-flow-line bg-flow-canvas"
      }`}
    >
      <p className="text-xs font-semibold">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-500">
        {task.responsibleTeam} · Due {formatDate(task.dueDate)}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        <StatusChip status={isBlocked ? "Blocked" : task.status} />
        {task.securityCritical && <StatusChip status="Critical" />}
        {task.executionStatus && task.executionStatus !== "Not Scheduled" && (
          <StatusChip status={task.executionStatus} />
        )}
      </div>
      {isBlocked && unmet.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-800">
          <Lock className="h-3 w-3" />
          Requires: {unmet.join(", ")}
        </p>
      )}
      <select
        className="mt-2 w-full rounded border border-flow-line bg-white px-2 py-1 text-[11px] disabled:bg-slate-100"
        value={isBlocked ? "Blocked" : task.status}
        disabled={isBlocked}
        onChange={(e) => onStatus(task.id, e.target.value as TaskStatus)}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export function OffboardingCaseView({ caseId }: { caseId: string }) {
  const { session } = useAuth();
  const { store, ready, service, refresh } = useData();
  const [banner, setBanner] = useState<string | null>(null);
  const isAdmin = session?.role === "Admin";

  const offCase = store.offboardingCases.find((c) => c.id === caseId);
  const employee = store.employees.find((e) => e.id === offCase?.employeeId);
  const tasks = useMemo(
    () => store.tasks.filter((t) => t.offboardingCaseId === caseId),
    [store.tasks, caseId]
  );
  const progress = useMemo(
    () => service.getOffboardingProgress(caseId),
    [service, caseId, store.tasks]
  );
  const activity = useMemo(
    () => service.listActivityForOffboardingCase(caseId),
    [service, caseId, store.activity]
  );
  const emails = useMemo(
    () => service.listEmailsForOffboardingCase(caseId),
    [service, caseId, store.mockEmails]
  );
  const exitForm = useMemo(
    () => service.getExitClearanceFormByCase(caseId),
    [service, caseId, store.exitClearanceForms]
  );
  const exitProgress = exitForm
    ? service.getExitFormProgress(exitForm.id)
    : null;

  const assetTasks = tasks.filter((t) =>
    /recover|asset inventory|backup|wipe/i.test(t.title)
  );
  const accessTasks = tasks.filter((t) => t.securityCritical);

  const assetDone = assetTasks.filter((t) => t.status === "Completed").length;
  const accessDone = accessTasks.filter((t) => t.status === "Completed").length;

  if (!ready) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!offCase || !employee) {
    return <p className="text-sm text-rose-600">Offboarding case not found.</p>;
  }

  const changeStatus = (taskId: string, status: TaskStatus) => {
    if (!session) return;
    const result = service.updateTaskStatusAsUser(session, taskId, status);
    if (!result.ok) setBanner(result.error);
    else setBanner(null);
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {offCase.caseNumber}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{employee.fullName}</h2>
            <p className="text-sm text-slate-500">
              {employee.role} · {employee.department} · {employee.location}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Last working day{" "}
              <strong>{formatDate(offCase.lastWorkingDate)}</strong> ·{" "}
              {offCase.terminationType}
              {offCase.terminationReason
                ? ` · ${offCase.terminationReason}`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusChip status={offCase.status} />
              <StatusChip status={offCase.riskLevel} />
              {offCase.immediateAccessRemovalRequired && (
                <StatusChip status="Critical" />
              )}
            </div>
          </div>
          <div className="w-full max-w-xs">
            <ProgressBar value={progress.overallProgress} />
            <p className="mt-1 text-right text-xs text-slate-500">
              {progress.overallProgress}% overall
            </p>
          </div>
        </div>
      </div>

      {exitForm && (
        <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Exit Clearance Form</h3>
              <p className="mt-1 text-xs text-slate-500">
                Status <StatusChip status={exitForm.formStatus} />
                {exitForm.submittedAt
                  ? ` · Submitted ${formatDate(exitForm.submittedAt.slice(0, 10))}`
                  : ""}
              </p>
              {exitProgress && (
                <p className="mt-2 text-xs text-slate-600">
                  Employee: {exitProgress.employeeSubmission} · Cleared:{" "}
                  {exitProgress.clearedCount ?? exitProgress.confirmedCount}/
                  {exitForm.checklistItems.length} ({exitProgress.percent}%)
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/oneflow/exit-clearance/${exitForm.id}`}
                className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                Open form
              </Link>
              <Link
                href={`/oneflow/exit-clearance/${exitForm.id}/print?mode=completed`}
                className="rounded-md border border-flow-line px-3 py-1.5 text-xs font-semibold"
              >
                Download Mock Form
              </Link>
              {isAdmin && session && (
                <>
                  <button
                    type="button"
                    className="rounded-md border border-flow-line px-3 py-1.5 text-xs font-semibold"
                    onClick={() => {
                      const r = service.adminSendExitFormEmail(
                        session,
                        exitForm.id
                      );
                      setBanner(r.ok ? "Exit form email sent." : r.error);
                      refresh();
                    }}
                  >
                    Send Form Email
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
                    onClick={() => {
                      const r = service.resetDanielExitFormJourney(session);
                      setBanner(
                        r.ok
                          ? "Daniel exit form journey reset."
                          : r.error
                      );
                      refresh();
                    }}
                  >
                    Reset Daniel Exit Form Journey
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2">Employee Answer</th>
                  <th className="py-2 pr-2">Confirmation Needed From</th>
                  <th className="py-2 pr-2">Assigned To</th>
                  <th className="py-2 pr-2">Confirmation Status</th>
                  <th className="py-2 pr-2">Confirmed By</th>
                  <th className="py-2">Confirmation Date</th>
                </tr>
              </thead>
              <tbody>
                {exitForm.checklistItems
                  .slice()
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{item.sequenceNumber}</td>
                      <td className="py-2 pr-2">
                        <p className="font-medium">{item.title}</p>
                        {Object.keys(item.conditionalValues).length > 0 && (
                          <p className="text-[10px] text-slate-500">
                            {Object.entries(item.conditionalValues)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        )}
                        {item.confirmationRemarks && (
                          <p className="text-[10px] text-slate-500">
                            Remarks: {item.confirmationRemarks}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <StatusChip status={item.employeeAnswer} />
                      </td>
                      <td className="py-2 pr-2">{item.confirmationDepartment}</td>
                      <td className="py-2 pr-2 text-xs">{item.confirmationAssignedEmail}</td>
                      <td className="py-2 pr-2">
                        <StatusChip status={item.confirmationStatus} />
                      </td>
                      <td className="py-2 pr-2">
                        {item.confirmationName
                          ? `${item.confirmationName} (${item.confirmationInitial})`
                          : "—"}
                      </td>
                      <td className="py-2">{item.confirmationDate || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {banner && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {banner}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Asset return summary</p>
          <p className="mt-1 text-xs text-slate-500">
            {assetDone}/{assetTasks.length} asset tasks completed
          </p>
          <ProgressBar
            value={
              assetTasks.length
                ? Math.round((assetDone / assetTasks.length) * 100)
                : 0
            }
            tone="blue"
          />
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {assetTasks.slice(0, 6).map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span>{t.title}</span>
                <StatusChip status={t.status} />
              </li>
            ))}
          </ul>
          <Link
            href="/oneflow/offboarding/assets"
            className="mt-3 inline-block text-xs font-semibold text-flow-accent hover:underline"
          >
            View all assets awaiting return →
          </Link>
        </div>

        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Access removal summary</p>
          <p className="mt-1 text-xs text-slate-500">
            {accessDone}/{accessTasks.length} security tasks completed
          </p>
          <ProgressBar
            value={
              accessTasks.length
                ? Math.round((accessDone / accessTasks.length) * 100)
                : 0
            }
            tone="blue"
          />
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {accessTasks.slice(0, 6).map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span>{t.title}</span>
                <StatusChip status={t.status} />
              </li>
            ))}
          </ul>
          <Link
            href="/oneflow/offboarding/access-removal"
            className="mt-3 inline-block text-xs font-semibold text-flow-accent hover:underline"
          >
            View access removal queue →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {CHECKLIST_GROUPS.map((group) => {
          const groupTasks = tasks.filter((t) => t.group === group);
          const gProg = progress.byGroup.find((g) => g.group === group);
          if (!groupTasks.length) return null;
          return (
            <div
              key={group}
              className="rounded-xl border border-flow-line bg-white shadow-sm"
            >
              <div className="border-b border-flow-line px-3 py-3">
                <p className="text-sm font-semibold">{group}</p>
                <p className="text-[11px] text-slate-500">
                  {gProg?.completed ?? 0}/{gProg?.total ?? groupTasks.length}{" "}
                  completed · {groupStatusLabel(groupTasks)}
                </p>
                <div className="mt-2">
                  <ProgressBar value={gProg?.percent ?? 0} tone="blue" />
                </div>
              </div>
              <div className="space-y-2 p-3">
                {groupTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    allTasks={tasks}
                    onStatus={changeStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Activity timeline</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
            {activity.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-flow-line px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(a.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.actor} · {a.detail}
                </p>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="text-sm text-slate-400">No activity yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Notification history</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
            {emails.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-flow-line px-3 py-2 text-sm"
              >
                <p className="font-medium">{e.subject}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  To {e.to} · {e.responsibleTeam} ·{" "}
                  {formatDateTime(e.sentAt)}
                </p>
                <Link
                  href={`/oneflow/inbox?selected=${e.id}`}
                  className="mt-1 inline-block text-xs font-semibold text-flow-accent hover:underline"
                >
                  Open in Mock Inbox →
                </Link>
              </li>
            ))}
            {emails.length === 0 && (
              <li className="text-sm text-slate-400">
                No offboarding notifications yet.
              </li>
            )}
          </ul>
        </div>
      </div>

      {isAdmin && (
        <OffboardingDemoControls
          caseId={caseId}
          onDone={(msg) => {
            setBanner(msg);
            refresh();
          }}
        />
      )}
    </div>
  );
}
