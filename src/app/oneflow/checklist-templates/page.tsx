"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDateTime } from "@/lib/utils";
import {
  RESPONSIBLE_TEAMS,
  TEMPLATE_CHECKLIST_GROUPS,
  TEAMS_FOR_TEMPLATE_GROUP,
  ESCALATION_EMAIL_RULES,
  defaultFixedEmailForTeam,
  type AssignedEmailRule,
  type EscalationEmailRule,
  type ChecklistTemplateTask,
  type ChecklistTemplateTaskInput,
  type LifecycleProcess,
  type ResponsibleTeam,
  type TemplateChecklistGroup,
} from "@/data";
import { Pencil, Plus, Copy, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

const emptyForm = (processType: LifecycleProcess = "Onboarding"): ChecklistTemplateTaskInput => ({
  processType,
  checklistGroup: "HR",
  responsibleTeam: "HR Operations",
  title: "",
  description: "",
  active: true,
  required: true,
  sortOrder: 10,
  dueOffsetDays: -1,
  dependencyTemplateTaskIds: [],
  assignedEmailRule: "Fixed Team Email",
  fixedAssignedEmail: defaultFixedEmailForTeam("HR Operations"),
  reminderEnabled: true,
  firstReminderAfterWorkingDays: 2,
  reminderFrequencyWorkingDays: 2,
  maximumReminderCount: 2,
  escalationAfterWorkingDays: 6,
  escalationEmailRule: "Admin",
  fixedEscalationEmail: "",
  securityCritical: false,
  executionMode: null,
  requiresPurchaseOrder: false,
});

export default function ChecklistTemplatesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, store, service, refresh } = useData();
  const [q, setQ] = useState("");
  const [processTab, setProcessTab] = useState<LifecycleProcess>("Onboarding");
  const [groupFilter, setGroupFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ChecklistTemplateTaskInput>(emptyForm());
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const templates = useMemo(() => {
    if (!ready) return [];
    return service.listChecklistTemplates();
  }, [ready, service, store.checklistTemplates]);

  const audits = useMemo(() => {
    if (!ready) return [];
    return service.listChecklistTemplateAudits();
  }, [ready, service, store.checklistTemplateAudits]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const processType = t.processType ?? "Onboarding";
      if (processType !== processTab) return false;
      if (groupFilter !== "all" && t.checklistGroup !== groupFilter) return false;
      if (teamFilter !== "all" && t.responsibleTeam !== teamFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.description} ${t.responsibleTeam}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [templates, processTab, groupFilter, teamFilter, q]);

  const preview = useMemo(
    () =>
      showPreview
        ? processTab === "Offboarding"
          ? service.previewOffboardingChecklist()
          : service.previewOnboardingChecklist()
        : [],
    [showPreview, processTab, service, store.checklistTemplates]
  );

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Checklist Templates">
        <p className="text-sm text-slate-500">Admin access required…</p>
      </OneFlowShell>
    );
  }

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(processTab));
    setFormOpen(true);
    setError(null);
  };

  const openEdit = (task: ChecklistTemplateTask) => {
    setEditingId(task.id);
    setForm({
      processType: task.processType ?? "Onboarding",
      checklistGroup: task.checklistGroup,
      responsibleTeam: task.responsibleTeam,
      title: task.title,
      description: task.description,
      active: task.active,
      required: task.required,
      sortOrder: task.sortOrder,
      dueOffsetDays: task.dueOffsetDays,
      dependencyTemplateTaskIds: [...task.dependencyTemplateTaskIds],
      assignedEmailRule: task.assignedEmailRule,
      fixedAssignedEmail: task.fixedAssignedEmail,
      reminderEnabled: task.reminderEnabled,
      firstReminderAfterWorkingDays: task.firstReminderAfterWorkingDays,
      reminderFrequencyWorkingDays: task.reminderFrequencyWorkingDays,
      maximumReminderCount: task.maximumReminderCount,
      escalationAfterWorkingDays: task.escalationAfterWorkingDays,
      escalationEmailRule: task.escalationEmailRule,
      fixedEscalationEmail: task.fixedEscalationEmail,
      securityCritical: task.securityCritical ?? false,
      executionMode: task.executionMode ?? null,
      requiresPurchaseOrder: task.requiresPurchaseOrder ?? false,
    });
    setFormOpen(true);
    setError(null);
  };

  const saveForm = () => {
    if (!session) return;
    const result = editingId
      ? service.updateChecklistTemplate(session, editingId, form)
      : service.createChecklistTemplate(session, form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFormOpen(false);
    setBanner(editingId ? "Template task updated." : "Template task added.");
    refresh();
  };

  const moveOrder = (task: ChecklistTemplateTask, delta: number) => {
    if (!session) return;
    const result = service.reorderChecklistTemplate(
      session,
      task.id,
      Math.max(1, task.sortOrder + delta)
    );
    if (!result.ok) setBanner(result.error);
    else setBanner("Task reordered.");
    refresh();
  };

  const toggleActive = (task: ChecklistTemplateTask) => {
    if (!session) return;
    const next = !task.active;
    const label = next ? "activate" : "deactivate";
    if (!confirm(`${label[0].toUpperCase()}${label.slice(1)} “${task.title}”?`)) {
      return;
    }
    const result = service.setChecklistTemplateActive(session, task.id, next);
    if (!result.ok) setBanner(result.error);
    else setBanner(`Task ${label}d.`);
    refresh();
  };

  const removeTask = (task: ChecklistTemplateTask) => {
    if (!session) return;
    if (service.isTemplateTaskUsedInCases(task.id)) {
      if (
        confirm(
          `“${task.title}” has been used in onboarding cases and cannot be deleted.\n\nDeactivate it instead?`
        )
      ) {
        const result = service.setChecklistTemplateActive(session, task.id, false);
        setBanner(
          result.ok
            ? "Task deactivated (historical cases unchanged)."
            : result.error
        );
        refresh();
      }
      return;
    }
    if (!confirm(`Permanently delete unused task “${task.title}”?`)) return;
    const result = service.deleteChecklistTemplate(session, task.id);
    if (!result.ok) {
      if (result.suggestDeactivate) {
        if (confirm(`${result.error}\n\nDeactivate instead?`)) {
          service.setChecklistTemplateActive(session, task.id, false);
          setBanner("Task deactivated.");
          refresh();
        }
      } else setBanner(result.error);
      return;
    }
    setBanner("Task deleted.");
    refresh();
  };

  const duplicate = (task: ChecklistTemplateTask) => {
    if (!session) return;
    const result = service.duplicateChecklistTemplate(session, task.id);
    if (!result.ok) setBanner(result.error);
    else {
      setBanner("Task duplicated (inactive copy).");
      openEdit(result.task);
    }
    refresh();
  };

  const onGroupChange = (group: TemplateChecklistGroup) => {
    const teams = TEAMS_FOR_TEMPLATE_GROUP[group];
    const team = teams[0];
    const isHiringManager = group === "Hiring Manager";
    setForm((f) => ({
      ...f,
      checklistGroup: group,
      responsibleTeam: team,
      assignedEmailRule: isHiringManager
        ? "Employee Manager Email"
        : f.assignedEmailRule === "Employee Manager Email"
          ? "Fixed Team Email"
          : f.assignedEmailRule,
      fixedAssignedEmail: isHiringManager
        ? ""
        : f.fixedAssignedEmail || defaultFixedEmailForTeam(team),
    }));
  };

  const grouped = TEMPLATE_CHECKLIST_GROUPS.map((g) => ({
    group: g,
    tasks: filtered.filter((t) => t.checklistGroup === g),
  }));

  return (
    <OneFlowShell
      title="Checklist Templates"
      subtitle="Admin configuration for onboarding and offboarding checklists"
    >
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Template changes apply to future {processTab.toLowerCase()} cases only.
      </div>

      <div className="mb-4 flex gap-1 rounded-md border border-flow-line bg-white p-0.5 w-fit">
        {(["Onboarding", "Offboarding"] as LifecycleProcess[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`rounded px-4 py-2 text-xs font-semibold ${
              processTab === p
                ? "bg-flow-accent text-white"
                : "text-slate-600"
            }`}
            onClick={() => {
              setProcessTab(p);
              setFormOpen(false);
            }}
          >
            {p} Templates
          </button>
        ))}
      </div>

      {(banner || error) && (
        <p
          className={`mb-3 rounded-md px-3 py-2 text-xs ${
            error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {error || banner}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[180px] flex-1 rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          placeholder="Search tasks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-sm"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="all">All groups</option>
          {TEMPLATE_CHECKLIST_GROUPS.map((g) => (
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
          <option value="all">All teams</option>
          {RESPONSIBLE_TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-flow-accent px-3 py-2 text-xs font-semibold text-white"
          onClick={openCreate}
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
        <button
          type="button"
          className="rounded-md border border-flow-line bg-white px-3 py-2 text-xs font-semibold"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? "Hide preview" : "Preview checklist"}
        </button>
      </div>

      {showPreview && (
        <div className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">
            Generated {processTab.toLowerCase()} checklist preview ({preview.length}{" "}
            active tasks)
          </p>
          <ol className="mt-3 space-y-1 text-sm text-slate-700">
            {preview.map((t, i) => (
              <li key={t.id}>
                {i + 1}. {t.title}{" "}
                <span className="text-xs text-slate-400">
                  · {t.checklistGroup} · {t.responsibleTeam} · due {t.dueOffsetDays}d
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {formOpen && (
        <div className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">
            {editingId ? "Edit template task" : "Add template task"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Task name
              <input
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Sort order
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Description
              <textarea
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Checklist group
              <select
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.checklistGroup}
                onChange={(e) =>
                  onGroupChange(e.target.value as TemplateChecklistGroup)
                }
              >
                {TEMPLATE_CHECKLIST_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Responsible team
              <select
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.responsibleTeam}
                onChange={(e) => {
                  const team = e.target.value as ResponsibleTeam;
                  setForm((f) => ({
                    ...f,
                    responsibleTeam: team,
                    assignedEmailRule:
                      team === "Hiring Manager"
                        ? "Employee Manager Email"
                        : f.assignedEmailRule,
                    fixedAssignedEmail:
                      team === "Hiring Manager"
                        ? ""
                        : f.fixedAssignedEmail ||
                          defaultFixedEmailForTeam(team),
                  }));
                }}
              >
                {TEAMS_FOR_TEMPLATE_GROUP[form.checklistGroup].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Due-date offset (days from {form.processType === "Offboarding" ? "last day" : "start"})
              <input
                type="number"
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.dueOffsetDays}
                onChange={(e) =>
                  setForm({ ...form, dueOffsetDays: Number(e.target.value) })
                }
              />
            </label>
            {form.processType === "Offboarding" && (
              <>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.securityCritical ?? false}
                    onChange={(e) =>
                      setForm({ ...form, securityCritical: e.target.checked })
                    }
                  />
                  Security-critical (access removal)
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Execution mode
                  <select
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.executionMode ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        executionMode: e.target.value
                          ? (e.target.value as ChecklistTemplateTaskInput["executionMode"])
                          : null,
                      })
                    }
                  >
                    <option value="">None</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Immediate">Immediate</option>
                    <option value="Manual Confirmation">Manual Confirmation</option>
                  </select>
                </label>
              </>
            )}
            <label className="text-xs font-semibold text-slate-600">
              Assigned email rule
              <select
                className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                value={form.assignedEmailRule}
                disabled={form.checklistGroup === "Hiring Manager"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    assignedEmailRule: e.target.value as AssignedEmailRule,
                  })
                }
              >
                <option value="Fixed Team Email">Fixed Team Email</option>
                <option value="Employee Manager Email">
                  Employee Manager Email
                </option>
              </select>
            </label>
            {form.assignedEmailRule === "Fixed Team Email" && (
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Fixed assigned email
                <input
                  className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                  value={form.fixedAssignedEmail}
                  onChange={(e) =>
                    setForm({ ...form, fixedAssignedEmail: e.target.value })
                  }
                />
              </label>
            )}
            <div className="sm:col-span-2 rounded-lg border border-flow-line bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Reminders & escalation (future cases only)
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.reminderEnabled}
                    onChange={(e) =>
                      setForm({ ...form, reminderEnabled: e.target.checked })
                    }
                  />
                  Reminder enabled
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  First reminder after (working days)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.firstReminderAfterWorkingDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        firstReminderAfterWorkingDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Reminder frequency (working days)
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.reminderFrequencyWorkingDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reminderFrequencyWorkingDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Maximum reminder count
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.maximumReminderCount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maximumReminderCount: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Escalate after (working days)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.escalationAfterWorkingDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        escalationAfterWorkingDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Escalation email rule
                  <select
                    className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                    value={form.escalationEmailRule}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        escalationEmailRule: e.target
                          .value as EscalationEmailRule,
                      })
                    }
                  >
                    {ESCALATION_EMAIL_RULES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                {form.escalationEmailRule === "Fixed Email" && (
                  <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                    Fixed escalation email
                    <input
                      className="mt-1 w-full rounded border border-flow-line px-2 py-1.5 text-sm font-normal"
                      value={form.fixedEscalationEmail}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fixedEscalationEmail: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) =>
                    setForm({ ...form, required: e.target.checked })
                  }
                />
                Required
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.requiresPurchaseOrder)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiresPurchaseOrder: e.target.checked,
                    })
                  }
                />
                Purchase order required
              </label>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-600">
                Dependencies
              </p>
              <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded border border-flow-line p-2">
                {templates
                  .filter(
                    (t) =>
                      t.id !== editingId &&
                      (t.processType ?? "Onboarding") ===
                        (form.processType ?? processTab)
                  )
                  .map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.dependencyTemplateTaskIds.includes(t.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...form.dependencyTemplateTaskIds, t.id]
                            : form.dependencyTemplateTaskIds.filter(
                                (id) => id !== t.id
                              );
                          setForm({ ...form, dependencyTemplateTaskIds: ids });
                        }}
                      />
                      {t.title}{" "}
                      <span className="text-slate-400">({t.checklistGroup})</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-rose-600">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white"
              onClick={saveForm}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-md border border-flow-line px-3 py-1.5 text-xs font-semibold"
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(({ group, tasks }) => (
          <div
            key={group}
            className="rounded-xl border border-flow-line bg-white shadow-sm"
          >
            <div className="border-b border-flow-line px-4 py-3">
              <p className="text-sm font-semibold">{group}</p>
              {group === "IT" && (
                <p className="text-[11px] text-slate-500">
                  Subteams: IT Security · Onsite IT Support
                </p>
              )}
            </div>
            <ul className="divide-y divide-flow-line">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <StatusChip status={t.active ? "Active" : "Inactive"} />
                      <StatusChip
                        status={t.required ? "Required" : "Optional"}
                      />
                      {t.securityCritical && <StatusChip status="Critical" />}
                      {t.executionMode && (
                        <StatusChip status={t.executionMode} />
                      )}
                      <span className="text-[10px] text-slate-400">
                        {t.responsibleTeam} · order {t.sortOrder} · due{" "}
                        {t.dueOffsetDays}d
                      </span>
                    </div>
                    {t.dependencyTemplateTaskIds.length > 0 && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Depends on:{" "}
                        {t.dependencyTemplateTaskIds
                          .map(
                            (id) =>
                              templates.find((x) => x.id === id)?.title ?? id
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      title="Move up"
                      className="rounded border border-flow-line p-1.5"
                      onClick={() => moveOrder(t, -10)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      className="rounded border border-flow-line p-1.5"
                      onClick={() => moveOrder(t, 10)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Edit"
                      className="rounded border border-flow-line p-1.5"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate"
                      className="rounded border border-flow-line p-1.5"
                      onClick={() => duplicate(t)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded border border-flow-line px-2 py-1 text-[10px] font-semibold"
                      onClick={() => toggleActive(t)}
                    >
                      {t.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      className="rounded border border-rose-200 p-1.5 text-rose-600"
                      onClick={() => removeTask(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="px-4 py-6 text-sm text-slate-400">
                  No matching tasks in this group.
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold">Recent template changes</p>
        <ul className="mt-3 space-y-2">
          {audits.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-flow-line px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold capitalize">
                  {a.action} · {a.taskTitle}
                </span>
                <span className="text-slate-400">
                  {formatDateTime(a.changedAt)}
                </span>
              </div>
              <p className="mt-0.5 text-slate-500">By {a.changedBy}</p>
            </li>
          ))}
          {audits.length === 0 && (
            <li className="text-sm text-slate-400">No template changes yet.</li>
          )}
        </ul>
      </div>
    </OneFlowShell>
  );
}
