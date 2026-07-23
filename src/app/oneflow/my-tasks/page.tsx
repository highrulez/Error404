"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { RESPONSIBLE_TEAMS, UNIFIED_TASK_TYPES, teamForRole } from "@/data";
import type { ChecklistTask } from "@/data";

type TabKey =
  | "my-work"
  | "team-queue"
  | "needs-attention"
  | "completed"
  | "all";

type GroupKey = "none" | "due" | "employee" | "lifecycle" | "department" | "type";

const TAB_STORAGE = "oneflow-my-tasks-tab";

function isOverdue(t: ChecklistTask, today: string) {
  return (
    t.status === "Overdue" ||
    (t.status !== "Completed" &&
      t.status !== "Cancelled" &&
      t.status !== "Blocked" &&
      t.dueDate < today)
  );
}

function taskTypeOf(t: ChecklistTask) {
  return t.taskType ?? (t.isExitClearanceConfirmation ? "Confirmation" : "Action");
}

function emailMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function MyTasksPage() {
  const { session } = useAuth();
  const { ready, store, service } = useData();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<TabKey>("my-work");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [status, setStatus] = useState("all");
  const [taskType, setTaskType] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [priority, setPriority] = useState("all");
  const [department, setDepartment] = useState("all");
  const [quick, setQuick] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_STORAGE) as TabKey | null;
      if (saved) setTab(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_STORAGE, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const allTasks = useMemo(() => {
    if (!session || !ready) return [];
    return service.listTasksForUser(session);
  }, [session, ready, service, store]);

  const userTeam = session ? teamForRole(session.role) : null;

  const metrics = useMemo(() => {
    const mine = allTasks.filter(
      (t) =>
        session &&
        emailMatch(t.assignedEmail, session.email) &&
        t.status !== "Completed" &&
        t.status !== "Cancelled"
    );
    return {
      open: mine.length,
      dueToday: mine.filter((t) => t.dueDate === today).length,
      overdue: mine.filter((t) => isOverdue(t, today)).length,
      attention: allTasks.filter(
        (t) =>
          t.status !== "Completed" &&
          t.status !== "Cancelled" &&
          (isOverdue(t, today) ||
            t.escalationStatus === "Escalated" ||
            t.outcome === "Returned for Correction" ||
            (t.status === "Blocked" && !t.dependencyTaskIds?.length))
      ).length,
    };
  }, [allTasks, session, today]);

  const filtered = useMemo(() => {
    if (!session) return [];
    return allTasks.filter((t) => {
      const type = taskTypeOf(t);
      const life = t.processType ?? "Onboarding";
      const emp = store.employees.find((e) => e.id === t.employeeId);
      const mine = emailMatch(t.assignedEmail, session.email);
      const team =
        Boolean(userTeam && t.responsibleTeam === userTeam) ||
        (session.role === "Admin" && !mine);

      if (tab === "my-work") {
        if (!mine) return false;
        if (t.status === "Completed" || t.status === "Cancelled") return false;
      }
      if (tab === "team-queue") {
        if (mine) return false;
        if (!team && session.role !== "Admin") return false;
        if (t.status === "Completed" || t.status === "Cancelled") return false;
      }
      if (tab === "needs-attention") {
        if (t.status === "Completed" || t.status === "Cancelled") return false;
        const attention =
          isOverdue(t, today) ||
          t.escalationStatus === "Escalated" ||
          t.outcome === "Returned for Correction" ||
          (t.status === "Blocked" && Boolean(t.blockedReason));
        if (!attention) return false;
      }
      if (tab === "completed") {
        if (t.status !== "Completed") return false;
      }
      if (tab === "all") {
        if (session.role !== "Admin") return false;
      }

      if (quick === "due-today" && t.dueDate !== today) return false;
      if (quick === "overdue" && !isOverdue(t, today)) return false;
      if (quick === "assigned-me" && !mine) return false;
      if (quick === "confirmation" && type !== "Confirmation") return false;
      if (quick === "approval" && type !== "Approval") return false;
      if (quick === "onboarding" && life !== "Onboarding") return false;
      if (quick === "offboarding" && life !== "Offboarding") return false;

      if (status !== "all" && t.status !== status) return false;
      if (taskType !== "all" && type !== taskType) return false;
      if (lifecycle !== "all" && life !== lifecycle) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (department !== "all" && (t.department || emp?.department) !== department)
        return false;

      if (qDebounced.trim()) {
        const needle = qDebounced.trim().toLowerCase();
        const hay = [
          t.title,
          emp?.fullName,
          emp?.employeeNumber,
          t.employeeId,
          t.assignedEmail,
          t.assignedUserName,
          t.employeeName,
          t.onboardingCaseId,
          t.offboardingCaseId,
          t.lifecycleCaseId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    allTasks,
    session,
    tab,
    quick,
    status,
    taskType,
    lifecycle,
    priority,
    department,
    qDebounced,
    today,
    store.employees,
    userTeam,
  ]);

  const preview = previewId
    ? filtered.find((t) => t.id === previewId) ||
      allTasks.find((t) => t.id === previewId)
    : null;

  const clearFilters = () => {
    setStatus("all");
    setTaskType("all");
    setLifecycle("all");
    setPriority("all");
    setDepartment("all");
    setQuick(null);
    setQ("");
  };

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (quick)
    activeChips.push({
      key: "quick",
      label: quick,
      clear: () => setQuick(null),
    });
  if (status !== "all")
    activeChips.push({
      key: "status",
      label: `Status: ${status}`,
      clear: () => setStatus("all"),
    });
  if (taskType !== "all")
    activeChips.push({
      key: "type",
      label: `Type: ${taskType}`,
      clear: () => setTaskType("all"),
    });
  if (lifecycle !== "all")
    activeChips.push({
      key: "life",
      label: lifecycle,
      clear: () => setLifecycle("all"),
    });

  if (!session) return null;

  const tabs: { key: TabKey; label: string; adminOnly?: boolean }[] = [
    { key: "my-work", label: "My Work" },
    { key: "team-queue", label: "Team Queue" },
    { key: "needs-attention", label: "Needs Attention" },
    { key: "completed", label: "Completed" },
    { key: "all", label: "All Tasks", adminOnly: true },
  ];

  return (
    <OneFlowShell
      title="My Tasks"
      subtitle="Work assigned to you and your teams"
    >
      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "My Open Tasks", value: metrics.open },
          { label: "Due Today", value: metrics.dueToday },
          { label: "Overdue", value: metrics.overdue, warn: true },
          { label: "Needs Attention", value: metrics.attention, warn: true },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-flow-line bg-white px-3 py-2"
          >
            <p className="text-[11px] text-slate-500">{m.label}</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                m.warn && m.value > 0 ? "text-amber-700" : "text-slate-900"
              }`}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-flow-line">
        {tabs
          .filter((t) => !t.adminOnly || session.role === "Admin")
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.key
                  ? "border-flow-accent text-flow-accent"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {/* Search + filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-[220px] flex-1 rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          placeholder="Search tasks, employees or case references"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-flow-line bg-white px-2 py-2 text-sm"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupKey)}
        >
          <option value="none">No grouping</option>
          <option value="due">Group by due date</option>
          <option value="employee">Group by employee</option>
          <option value="lifecycle">Group by case</option>
          <option value="department">Group by department</option>
          <option value="type">Group by type</option>
        </select>
        <button
          type="button"
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-medium"
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters
        </button>
      </div>

      {/* Quick filters */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(
          [
            ["due-today", "Due Today"],
            ["overdue", "Overdue"],
            ["assigned-me", "Assigned to Me"],
            ["confirmation", "Confirmation"],
            ["approval", "Approval"],
            ["onboarding", "Onboarding"],
            ["offboarding", "Offboarding"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setQuick(quick === k ? null : k)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              quick === k
                ? "border-flow-accent bg-flow-accentSoft text-flow-accent"
                : "border-flow-line bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mb-3 grid gap-2 rounded-lg border border-flow-line bg-white p-3 sm:grid-cols-4">
          <select
            className="rounded border border-flow-line px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {[
              "Pending",
              "In Progress",
              "Blocked",
              "Overdue",
              "Completed",
              "Cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-flow-line px-2 py-1.5 text-sm"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          >
            <option value="all">All types</option>
            {UNIFIED_TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-flow-line px-2 py-1.5 text-sm"
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
          >
            <option value="all">All lifecycles</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Offboarding">Offboarding</option>
          </select>
          <select
            className="rounded border border-flow-line px-2 py-1.5 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">All departments</option>
            {RESPONSIBLE_TEAMS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-flow-line px-2 py-1.5 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">All priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button
            type="button"
            className="text-sm text-flow-accent underline sm:col-span-3"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {c.label} ×
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto rounded-lg border border-flow-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-flow-line bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Lifecycle</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const emp = store.employees.find((e) => e.id === t.employeeId);
                const overdue = isOverdue(t, today);
                return (
                  <tr
                    key={t.id}
                    className={`cursor-pointer border-b border-flow-line/70 hover:bg-slate-50 ${
                      previewId === t.id ? "bg-sky-50/60" : ""
                    }`}
                    onClick={() => setPreviewId(t.id)}
                    onDoubleClick={() => router.push(`/oneflow/tasks/${t.id}`)}
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/oneflow/tasks/${t.id}`}
                        className="font-medium text-slate-900 hover:text-flow-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {t.employeeName || emp?.fullName || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={taskTypeOf(t)} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={t.processType || "Onboarding"} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {t.responsibleTeam || t.department || "—"}
                    </td>
                    <td
                      className={`px-3 py-2 tabular-nums ${
                        overdue ? "font-semibold text-amber-700" : ""
                      }`}
                    >
                      {formatDate(t.dueDate)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={t.priority || "Medium"} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip status={t.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {t.assignedPersonName || t.assignedEmail}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-sm text-slate-400"
                  >
                    No tasks match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="border-t border-flow-line px-3 py-2 text-[11px] text-slate-400">
            {filtered.length} task{filtered.length === 1 ? "" : "s"}
            {groupBy !== "none" ? ` · grouping: ${groupBy}` : ""}
          </p>
        </div>

        {/* Optional preview drawer */}
        <aside className="hidden rounded-lg border border-flow-line bg-white p-4 lg:block">
          {!preview ? (
            <p className="text-sm text-slate-400">
              Select a row to preview. Double-click or open to work the task.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-slate-900">{preview.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <StatusChip status={preview.status} />
                <StatusChip status={taskTypeOf(preview)} />
              </div>
              <dl className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>Employee</dt>
                  <dd className="font-medium text-slate-800">
                    {preview.employeeName || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Due</dt>
                  <dd className="font-medium">{formatDate(preview.dueDate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Assignee</dt>
                  <dd className="font-medium">{preview.assignedEmail}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-500 line-clamp-4">
                {preview.instructions || preview.description || "No instructions."}
              </p>
              <Link
                href={`/oneflow/tasks/${preview.id}`}
                className="inline-block rounded-md bg-flow-accent px-3 py-2 text-xs font-semibold text-white"
              >
                Open Full Task
              </Link>
            </div>
          )}
        </aside>
      </div>
    </OneFlowShell>
  );
}
