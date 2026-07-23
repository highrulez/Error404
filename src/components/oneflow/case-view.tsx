"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import {
  ACCOUNT_CREATED_RECIPIENT,
  areItSecurityAccountTasksComplete,
  canViewTask,
  CHECKLIST_GROUPS,
  RESPONSIBLE_TEAMS,
  teamForRole,
  unmetPrerequisiteTitles,
} from "@/data";
import { addWorkingDaysIso } from "@/data/working-days";
import type { ChecklistGroup, ChecklistTask, ResponsibleTeam, TaskStatus } from "@/data";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import { ProgressBar, StatusChip } from "@/components/shared/status";
import { OnboardingDemoControls } from "@/components/oneflow/onboarding-demo-controls";
import { formatDate, formatDateTime, TASK_STATUSES } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Lock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { inductionSectionProgress } from "@/data/induction-seed";
import { ALICIA_INDUCTION_FORM_ID } from "@/data/alicia-types";

function groupNotificationSummary(tasks: ChecklistTask[]) {
  const teams = [...new Set(tasks.map((t) => t.responsibleTeam))];
  return teams.map((team) => {
    const teamTasks = tasks.filter((t) => t.responsibleTeam === team);
    const statuses = teamTasks.map((t) => t.notificationStatus);
    let status: string = "Not Sent";
    if (statuses.includes("Failed")) status = "Failed";
    else if (statuses.includes("Pending")) status = "Pending";
    else if (statuses.includes("Simulated")) status = "Simulated";
    else if (statuses.includes("Sent")) status = "Sent";
    const sentAt = teamTasks
      .map((t) => t.notificationSentAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    return { team, status, sentAt: sentAt || null };
  });
}

function groupStatusLabel(tasks: ChecklistTask[]): string {
  if (!tasks.length) return "Empty";
  if (tasks.every((t) => t.status === "Completed")) return "Completed";
  if (tasks.some((t) => t.status === "Blocked")) return "Blocked";
  if (
    tasks.some(
      (t) =>
        t.status === "Overdue" ||
        (t.status !== "Completed" &&
          t.status !== "Blocked" &&
          t.dueDate < new Date().toISOString().slice(0, 10))
    )
  ) {
    return "Overdue";
  }
  if (tasks.some((t) => t.status === "In Progress")) return "In Progress";
  return "Pending";
}

function EditableTaskCard({
  task,
  allTasks,
  noteDrafts,
  setNoteDrafts,
  changeStatus,
  changeNotes,
  isAdmin,
  onReminderAction,
}: {
  task: ChecklistTask;
  allTasks: ChecklistTask[];
  noteDrafts: Record<string, string>;
  setNoteDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  changeStatus: (taskId: string, status: TaskStatus) => void;
  changeNotes: (taskId: string, notes: string) => void;
  isAdmin?: boolean;
  onReminderAction?: (
    action: "send" | "reschedule" | "stop" | "escalate",
    taskId: string
  ) => void;
}) {
  const unmet = unmetPrerequisiteTitles(task, allTasks);
  const isBlocked = task.status === "Blocked" || unmet.length > 0;
  const isOverdue =
    !isBlocked &&
    (task.status === "Overdue" ||
      (task.status !== "Completed" &&
        task.dueDate < new Date().toISOString().slice(0, 10)));
  const done = task.status === "Completed";
  const reminderStatus = task.reminderStatus ?? "Scheduled";

  return (
    <div
      className={`rounded-lg border p-2 ${
        isBlocked
          ? "border-amber-200 bg-amber-50"
          : isOverdue
            ? "border-rose-200 bg-rose-50"
            : "border-flow-line bg-flow-canvas"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Toggle complete"
          disabled={isBlocked}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-white"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => changeStatus(task.id, done ? "Pending" : "Completed")}
        >
          {done && <Check className="h-3 w-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug">{task.title}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Team: {task.responsibleTeam}
          </p>
          <p className="text-[10px] text-slate-500">
            {task.assignedPersonName} · {task.assignedEmail}
          </p>
          {isBlocked && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-800">
              <Lock className="h-3 w-3 shrink-0" />
              Waiting for prerequisite
            </p>
          )}
          {isBlocked && unmet.length > 0 && (
            <p className="mt-0.5 text-[10px] text-amber-700">
              Requires: {unmet.join(", ")}
            </p>
          )}
          {isOverdue && (
            <p className="mt-1 text-[10px] font-semibold text-rose-600">
              Overdue · {formatDate(task.dueDate)}
            </p>
          )}
          {done && task.completedAt && (
            <p className="mt-1 text-[10px] text-emerald-700">
              Completed {formatDateTime(task.completedAt)}
            </p>
          )}
          {!done && !isOverdue && !isBlocked && (
            <p className="mt-1 text-[10px] text-slate-500">
              Due {formatDate(task.dueDate)}
            </p>
          )}
          {isAdmin && (
            <div className="mt-2 space-y-1 rounded border border-flow-line bg-white/80 p-1.5 text-[10px] text-slate-600">
              <div className="flex flex-wrap gap-1">
                <StatusChip status={reminderStatus} />
                {task.escalatedAt && <StatusChip status="Escalated" />}
              </div>
              <p>Reminders: {task.reminderCount ?? 0}</p>
              <p>
                Next:{" "}
                {task.nextReminderDueAt
                  ? formatDate(task.nextReminderDueAt.slice(0, 10))
                  : "—"}
              </p>
              <p>
                Last sent:{" "}
                {task.lastReminderSentAt || task.lastReminderAt
                  ? formatDateTime(
                      (task.lastReminderSentAt || task.lastReminderAt)!
                    )
                  : "—"}
              </p>
              <p>
                Escalation due:{" "}
                {task.escalationDueAt
                  ? formatDate(task.escalationDueAt.slice(0, 10))
                  : "—"}
              </p>
              {onReminderAction && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded border border-flow-line px-1.5 py-0.5 font-semibold"
                    onClick={() => onReminderAction("send", task.id)}
                  >
                    Send Reminder Now
                  </button>
                  <button
                    type="button"
                    className="rounded border border-flow-line px-1.5 py-0.5 font-semibold"
                    onClick={() => onReminderAction("reschedule", task.id)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="rounded border border-flow-line px-1.5 py-0.5 font-semibold"
                    onClick={() => onReminderAction("stop", task.id)}
                  >
                    Stop Reminders
                  </button>
                  <button
                    type="button"
                    className="rounded border border-rose-200 px-1.5 py-0.5 font-semibold text-rose-700"
                    onClick={() => onReminderAction("escalate", task.id)}
                  >
                    Resend Escalation
                  </button>
                </div>
              )}
            </div>
          )}
          <select
            className="mt-2 w-full rounded border border-flow-line bg-white px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            value={isBlocked ? "Blocked" : task.status}
            disabled={isBlocked}
            onChange={(e) =>
              changeStatus(task.id, e.target.value as TaskStatus)
            }
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            className="mt-2 w-full rounded border border-flow-line bg-white px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:bg-slate-100"
            rows={2}
            placeholder="Add notes…"
            disabled={isBlocked}
            value={noteDrafts[task.id] ?? task.notes}
            onChange={(e) =>
              setNoteDrafts((d) => ({
                ...d,
                [task.id]: e.target.value,
              }))
            }
            onBlur={() => {
              const val = noteDrafts[task.id];
              if (val !== undefined && val !== task.notes) {
                changeNotes(task.id, val);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CompactOtherTeamTask({ task }: { task: ChecklistTask }) {
  const isBlocked = task.status === "Blocked";
  const isOverdue =
    !isBlocked &&
    (task.status === "Overdue" ||
      (task.status !== "Completed" &&
        task.dueDate < new Date().toISOString().slice(0, 10)));
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5">
      <p className="text-[11px] font-medium text-slate-600">{task.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <StatusChip status={task.status} />
        {isBlocked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700">
            <Lock className="h-2.5 w-2.5" /> Blocked
          </span>
        )}
        {isOverdue && (
          <span className="text-[10px] font-semibold text-rose-600">Overdue</span>
        )}
      </div>
    </div>
  );
}

function ReadOnlyGroupCard({
  group,
  tasks,
  gProg,
}: {
  group: ChecklistGroup;
  tasks: ChecklistTask[];
  gProg?: { completed: number; total: number; percent: number };
}) {
  const teams = [...new Set(tasks.map((t) => t.responsibleTeam))];
  const status = groupStatusLabel(tasks);
  const hasBlocked = tasks.some((t) => t.status === "Blocked");
  const hasOverdue = tasks.some(
    (t) =>
      t.status === "Overdue" ||
      (t.status !== "Completed" &&
        t.status !== "Blocked" &&
        t.dueDate < new Date().toISOString().slice(0, 10))
  );

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">{group}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-500">
        Read-only — owned by {teams.join(", ") || "other teams"}
      </p>
      <p className="mt-2 text-xs text-slate-600">
        {gProg?.completed ?? 0}/{gProg?.total ?? tasks.length} completed ·{" "}
        {gProg?.percent ?? 0}%
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <StatusChip status={status} />
        {hasBlocked && <StatusChip status="Blocked" />}
        {hasOverdue && <StatusChip status="Overdue" />}
      </div>
      <div className="mt-3">
        <ProgressBar value={gProg?.percent ?? 0} tone="blue" />
      </div>
    </div>
  );
}

export function OnboardingCaseView({ caseId }: { caseId: string }) {
  const { session } = useAuth();
  const {
    store,
    ready,
    getCaseProgress,
    retryFailedNotification,
    simulateReminder,
    triggerNewHireWorkflow,
    service,
    refresh,
  } = useData();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const isAdmin = session?.role === "Admin";
  const userTeam = session ? teamForRole(session.role) : null;

  const changeStatus = (taskId: string, status: TaskStatus) => {
    if (!session) return;
    const result = service.updateTaskStatusAsUser(session, taskId, status);
    if (!result.ok) setBanner(result.error);
    else setBanner(result.notice ?? null);
    refresh();
  };

  const changeNotes = (taskId: string, notes: string) => {
    if (!session) return;
    const result = service.updateTaskNotesAsUser(session, taskId, notes);
    if (!result.ok) setBanner(result.error);
    else setBanner(null);
    refresh();
  };

  const onReminderAction = (
    action: "send" | "reschedule" | "stop" | "escalate",
    taskId: string
  ) => {
    if (!session) return;
    if (action === "send") {
      const result = service.sendTaskReminderNow(session, taskId);
      setBanner(result.ok ? result.message : result.error);
    } else if (action === "stop") {
      if (!confirm("Stop all reminders for this task?")) return;
      const result = service.stopTaskReminders(session, taskId);
      setBanner(result.ok ? result.message : result.error);
    } else if (action === "escalate") {
      if (!confirm("Resend escalation email?")) return;
      const result = service.resendTaskEscalation(session, taskId);
      setBanner(result.ok ? result.message : result.error);
    } else if (action === "reschedule") {
      const days = prompt("Reschedule first/next reminder in how many working days?", "2");
      if (days === null) return;
      const n = Number(days);
      if (!Number.isFinite(n) || n < 0) {
        setBanner("Enter a valid number of working days.");
        return;
      }
      const nextAt = addWorkingDaysIso(new Date(), n);
      const result = service.rescheduleTaskReminder(session, taskId, nextAt);
      setBanner(result.ok ? result.message : result.error);
    }
    refresh();
  };

  const onb = store.onboardingCases.find((c) => c.id === caseId);
  const employee = store.employees.find((e) => e.id === onb?.employeeId);
  const tasks = store.tasks.filter((t) => t.onboardingCaseId === caseId);
  const activity = store.activity.filter((a) => a.onboardingCaseId === caseId);
  const progress = getCaseProgress(caseId);
  const mode = store.settings.automationMode;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (dept !== "all" && t.group !== dept) return false;
      if (status !== "all" && t.status !== status) return false;
      if (location !== "all" && employee?.location !== location) return false;
      if (teamFilter !== "all" && t.responsibleTeam !== teamFilter) return false;
      return true;
    });
  }, [tasks, dept, status, location, teamFilter, employee]);

  const orderedGroups = useMemo(() => {
    if (isAdmin || !session || !userTeam) return [...CHECKLIST_GROUPS];
    const own = CHECKLIST_GROUPS.filter((g) =>
      tasks.some((t) => t.group === g && t.responsibleTeam === userTeam)
    );
    const other = CHECKLIST_GROUPS.filter((g) => !own.includes(g));
    return [...own, ...other];
  }, [isAdmin, session, userTeam, tasks]);

  if (!ready) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!onb || !employee) {
    return <p className="text-sm text-rose-600">Onboarding case not found.</p>;
  }

  const overdueTasks = tasks.filter(
    (t) =>
      t.status === "Overdue" ||
      (t.status !== "Completed" &&
        t.status !== "Blocked" &&
        t.dueDate < new Date().toISOString().slice(0, 10))
  );

  const hasFailed = tasks.some((t) => t.notificationStatus === "Failed");

  const runAction = async (
    key: string,
    fn: () => Promise<{ ok: boolean; message: string }>
  ) => {
    setBusy(key);
    setBanner(null);
    const result = await fn();
    setBanner(result.message);
    setBusy(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {onb.caseNumber}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{employee.fullName}</h2>
            <p className="text-sm text-slate-500">
              {employee.role} · {employee.department} · {employee.location}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Start date {formatDate(employee.startDate)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusChip status={employee.employmentStatus} />
              <StatusChip status={onb.status} />
              <StatusChip
                status={mode === "live" ? "Live Automation" : "Simulation Mode"}
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/workday/employees/${employee.id}`}
              className="text-sm font-medium text-flow-accent hover:underline"
            >
              View in PPG Workday →
            </Link>
            {isAdmin && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    runAction("trigger", () => triggerNewHireWorkflow(caseId))
                  }
                >
                  {busy === "trigger" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Trigger workflow
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    runAction("remind-check", async () => {
                      if (!session)
                        return { ok: false, message: "Not signed in." };
                      const result = service.runReminderCheck(session);
                      refresh();
                      return {
                        ok: result.ok,
                        message: result.ok ? result.message : result.error,
                      };
                    })
                  }
                >
                  {busy === "remind-check" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Run Reminder Check
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    runAction("remind", () => simulateReminder(caseId))
                  }
                >
                  Simulate reminder
                </button>
                {(hasFailed || onb.lastWorkflowError) && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() =>
                      runAction("retry", () => retryFailedNotification(caseId))
                    }
                  >
                    {busy === "retry" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Retry Notification
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {banner && (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-xs ${
              banner.toLowerCase().includes("not authorized") ||
              banner.toLowerCase().includes("blocked")
                ? "bg-rose-50 text-rose-900"
                : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {banner}
          </p>
        )}
        {onb.lastWorkflowError && (
          <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {onb.lastWorkflowError}
          </p>
        )}

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">Overall progress</span>
            <span className="tabular-nums text-slate-500">
              {progress.completedCount}/{tasks.length} · {progress.overallProgress}%
            </span>
          </div>
          <ProgressBar value={progress.overallProgress} tone="blue" />
        </div>

        {(() => {
          const laptop = service.getLaptopRequestByCase(caseId);
          if (!laptop) return null;
          return (
            <div className="mt-5 rounded-lg border border-flow-line bg-flow-canvas/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Laptop Request
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {laptop.requestStatus}
                    {laptop.managerDecision
                      ? ` · Manager: ${laptop.managerDecision}`
                      : ""}
                  </p>
                </div>
                {laptop.managerTaskId || laptop.procurementTaskId ? (
                  <Link
                    href={`/oneflow/tasks/${
                      laptop.procurementTaskId || laptop.managerTaskId
                    }`}
                    className="text-xs font-semibold text-flow-accent underline"
                  >
                    View Laptop Request
                  </Link>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  Credit:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.departmentCreditNumber || "—"}
                  </span>
                </div>
                <div>
                  Cost centre:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.costCentre || "—"}
                  </span>
                </div>
                <div>
                  Type:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.laptopRequirementType || "—"}
                  </span>
                </div>
                <div>
                  PO:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.purchaseOrderNumber || "—"}
                  </span>
                </div>
                <div>
                  Est. delivery:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.estimatedDeliveryDate
                      ? formatDate(laptop.estimatedDeliveryDate)
                      : "—"}
                  </span>
                </div>
                <div>
                  Onsite IT:{" "}
                  <span className="font-medium text-slate-800">
                    {laptop.onsiteStatus || "—"}
                  </span>
                </div>
              </dl>
            </div>
          );
        })()}

        {(() => {
          const induction =
            service.getInductionForm(ALICIA_INDUCTION_FORM_ID) ||
            store.inductionForms.find((f) => f.lifecycleCaseId === caseId);
          if (!induction) return null;
          const prog = inductionSectionProgress(induction);
          const presenterTasks = store.tasks.filter(
            (t) =>
              t.isInductionPresenterTask &&
              (t.relatedFormId === induction.id ||
                t.linkedInductionFormId === induction.id)
          );
          const overduePresenters = presenterTasks.filter(
            (t) =>
              t.status !== "Completed" &&
              t.status !== "Cancelled" &&
              t.dueDate < new Date().toISOString().slice(0, 10)
          );
          const reviewTask = store.tasks.find(
            (t) =>
              t.isInductionReviewTask &&
              (t.relatedFormId === induction.id ||
                t.linkedInductionFormId === induction.id)
          );
          return (
            <div className="mt-5 rounded-lg border border-flow-line bg-flow-canvas/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Induction Checklist
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {induction.formStatus} · {prog.cleared} of {prog.required}{" "}
                    required sections cleared
                  </p>
                </div>
                <Link
                  href={`/oneflow/my-forms/induction/${induction.id}`}
                  className="text-xs font-semibold text-flow-accent underline"
                >
                  View Checklist
                </Link>
              </div>
              <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  Pending sections:{" "}
                  <span className="font-medium text-slate-800">
                    {prog.pending.length}
                  </span>
                </div>
                <div>
                  Overdue presenter tasks:{" "}
                  <span className="font-medium text-slate-800">
                    {overduePresenters.length}
                  </span>
                </div>
                <div>
                  Employee acknowledgement:{" "}
                  <span className="font-medium text-slate-800">
                    {induction.employeeDeclaration || induction.typedSignature
                      ? "Signed"
                      : "Unsigned"}
                  </span>
                </div>
                <div>
                  HR final review:{" "}
                  <span className="font-medium text-slate-800">
                    {reviewTask
                      ? reviewTask.status
                      : induction.formStatus === "Completed"
                        ? "Completed"
                        : "Not started"}
                  </span>
                </div>
              </dl>
              {prog.pending.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-500">
                  {prog.pending.slice(0, 7).map((s) => (
                    <li key={s.id}>{s.sectionName}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Completed", value: progress.completedCount },
            { label: "Pending", value: progress.pendingCount },
            { label: "Overdue", value: progress.overdueCount },
            { label: "In progress", value: progress.inProgressCount },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-flow-line bg-flow-canvas px-3 py-2 text-center"
            >
              <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {progress.byGroup.map((g) => (
            <div key={g.group} className="rounded-lg border border-flow-line p-3">
              <p className="text-xs font-semibold">
                {g.group.replace(" Checklist", "")}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {g.completed}/{g.total} · {g.percent}%
              </p>
              <div className="mt-2">
                <ProgressBar value={g.percent} tone="blue" />
              </div>
            </div>
          ))}
        </div>

        {isAdmin && onb && (
          <div className="mt-5 rounded-lg border border-flow-line bg-flow-canvas p-4">
            <p className="text-sm font-semibold">Account Created notification</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p>
                Status:{" "}
                <strong>
                  {onb.accountCreatedEmailSent ? "Sent" : "Not Sent"}
                </strong>
              </p>
              <p>
                Recipient: <strong>{ACCOUNT_CREATED_RECIPIENT}</strong>
              </p>
              <p>
                Sent time:{" "}
                <strong>
                  {onb.accountCreatedEmailSentAt
                    ? formatDateTime(onb.accountCreatedEmailSentAt)
                    : "—"}
                </strong>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  busy !== null ||
                  !areItSecurityAccountTasksComplete(tasks)
                }
                className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() =>
                  runAction("resend-acct", async () => {
                    if (!session) return { ok: false, message: "Not signed in." };
                    const result = service.resendAccountCreatedEmail(
                      caseId,
                      session.name
                    );
                    refresh();
                    return { ok: result.ok, message: result.message };
                  })
                }
              >
                {busy === "resend-acct" ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : null}{" "}
                Resend Account Created Email
              </button>
              {onb.accountCreatedEmailId && (
                <Link
                  href={`/oneflow/inbox?selected=${onb.accountCreatedEmailId}`}
                  className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold text-flow-accent hover:underline"
                >
                  View Email
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {overdueTasks.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Overdue tasks ({overdueTasks.length})
          </p>
          <ul className="mt-2 space-y-1 text-sm text-rose-800">
            {overdueTasks.map((t) => (
              <li key={t.id}>
                {t.title} · due {formatDate(t.dueDate)} · {t.responsibleTeam}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option value="all">All checklist groups</option>
            {CHECKLIST_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">All responsible teams</option>
            {RESPONSIBLE_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="all">All locations</option>
            <option value={employee.location}>{employee.location}</option>
          </select>
        </div>
      )}

      {isAdmin ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {CHECKLIST_GROUPS.map((group) => {
            const groupTasks = filteredTasks.filter((t) => t.group === group);
            const allGroupTasks = tasks.filter((t) => t.group === group);
            const gProg = progress.byGroup.find((g) => g.group === group);
            const notifications = groupNotificationSummary(allGroupTasks);
            return (
              <div
                key={group}
                className="rounded-xl border border-flow-line bg-white shadow-sm"
              >
                <div className="border-b border-flow-line px-3 py-3">
                  <p className="text-sm font-semibold">{group}</p>
                  <p className="text-[11px] text-slate-500">
                    {gProg?.completed}/{gProg?.total} completed
                  </p>
                  <div className="mt-2 space-y-1">
                    {notifications.map((n) => (
                      <div
                        key={n.team}
                        className="flex flex-wrap items-center gap-1 text-[10px]"
                      >
                        <span className="text-slate-500">{n.team}:</span>
                        <StatusChip status={n.status} />
                        {n.sentAt && (
                          <span className="text-slate-400">
                            {formatDateTime(n.sentAt)}
                          </span>
                        )}
                        {n.status === "Failed" && (
                          <button
                            type="button"
                            className="ml-1 font-semibold text-rose-600 underline"
                            onClick={() =>
                              runAction(`retry-${n.team}`, () =>
                                retryFailedNotification(
                                  caseId,
                                  n.team as ResponsibleTeam
                                )
                              )
                            }
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={gProg?.percent ?? 0} tone="blue" />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {groupTasks.map((t) => (
                    <EditableTaskCard
                      key={t.id}
                      task={t}
                      allTasks={tasks}
                      noteDrafts={noteDrafts}
                      setNoteDrafts={setNoteDrafts}
                      changeStatus={changeStatus}
                      changeNotes={changeNotes}
                      isAdmin={isAdmin}
                      onReminderAction={onReminderAction}
                    />
                  ))}
                  {groupTasks.length === 0 && (
                    <p className="text-xs text-slate-400">No matching tasks.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {orderedGroups.map((group) => {
            const allGroupTasks = tasks.filter((t) => t.group === group);
            const gProg = progress.byGroup.find((g) => g.group === group);
            const myTasks = allGroupTasks.filter(
              (t) => session && canViewTask(session, t, employee)
            );
            const otherTasks = allGroupTasks.filter(
              (t) => !session || !canViewTask(session, t, employee)
            );

            if (myTasks.length === 0) {
              return (
                <ReadOnlyGroupCard
                  key={group}
                  group={group}
                  tasks={allGroupTasks}
                  gProg={gProg}
                />
              );
            }

            return (
              <div
                key={group}
                className="rounded-xl border border-flow-line bg-white shadow-sm"
              >
                <div className="border-b border-flow-line px-4 py-3">
                  <p className="text-sm font-semibold">{group}</p>
                  <p className="text-[11px] text-slate-500">
                    {gProg?.completed}/{gProg?.total} completed · your team tasks
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={gProg?.percent ?? 0} tone="blue" />
                  </div>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {myTasks.map((t) => (
                    <EditableTaskCard
                      key={t.id}
                      task={t}
                      allTasks={tasks}
                      noteDrafts={noteDrafts}
                      setNoteDrafts={setNoteDrafts}
                      changeStatus={changeStatus}
                      changeNotes={changeNotes}
                      isAdmin={false}
                    />
                  ))}
                </div>
                {otherTasks.length > 0 && (
                  <div className="border-t border-flow-line px-4 py-3">
                    <p className="mb-2 text-[11px] font-medium text-slate-500">
                      Read-only — owned by{" "}
                      {[...new Set(otherTasks.map((t) => t.responsibleTeam))].join(
                        ", "
                      )}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {otherTasks.map((t) => (
                        <CompactOtherTeamTask key={t.id} task={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-flow-line bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Activity timeline</h3>
        <ul className="mt-3 space-y-2">
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

      {isAdmin && (
        <OnboardingDemoControls
          caseId={caseId}
          onDone={(message) => setBanner(message)}
        />
      )}
    </div>
  );
}
