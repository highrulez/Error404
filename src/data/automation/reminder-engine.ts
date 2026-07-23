import type { AutomationRun, MockEmail } from "../auth-types";
import { TEAM_INBOX_EMAIL } from "../auth-accounts";
import type { UnitOfWork } from "../repositories/interfaces";
import type { ChecklistTask, Employee, ReminderStatus } from "../types";
import type { EscalationEmailRule } from "../template-types";
import {
  addWorkingDaysIso,
  isOnOrAfter,
  isPastDueDate,
} from "../working-days";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function resolveAssigneeInbox(task: ChecklistTask, employee: Employee): string {
  if (task.responsibleTeam === "Hiring Manager") {
    return employee.managerEmail || TEAM_INBOX_EMAIL["Hiring Manager"];
  }
  if (task.assignedEmail?.includes("@ppg-demo.com")) {
    return task.assignedEmail;
  }
  return TEAM_INBOX_EMAIL[task.responsibleTeam] || task.assignedEmail;
}

export function resolveEscalationCc(
  task: ChecklistTask,
  employee: Employee
): string {
  const rule = (task.escalationEmailRule ?? "Admin") as EscalationEmailRule;
  switch (rule) {
    case "Admin":
      return "admin@ppg-demo.com";
    case "HR Operations":
      return TEAM_INBOX_EMAIL["HR Operations"];
    case "Hiring Manager":
      return employee.managerEmail === "manager@ppg-demo.com"
        ? "manager@ppg-demo.com"
        : employee.managerEmail || TEAM_INBOX_EMAIL["Hiring Manager"];
    case "Fixed Email":
      return task.fixedEscalationEmail?.trim() || "admin@ppg-demo.com";
  }
}

export function isNotStartedReminderEligible(
  task: ChecklistTask,
  asOf: Date = new Date()
): boolean {
  if (task.reminderEnabled === false) return false;
  if (task.status !== "Pending") return false;
  if (task.reminderStatus === "Stopped" || task.reminderStatus === "Escalated") {
    return false;
  }
  const max = task.maximumReminderCount ?? 2;
  if ((task.reminderCount ?? 0) >= max) return false;
  if (!task.nextReminderDueAt) return false;
  return isOnOrAfter(asOf, task.nextReminderDueAt);
}

export function isOverdueReminderEligible(
  task: ChecklistTask,
  asOf: Date = new Date()
): boolean {
  if (task.status === "Completed" || task.status === "Blocked") return false;
  if (!task.dueDate) return false;
  return isPastDueDate(task.dueDate, asOf);
}

export function isEscalationEligible(
  task: ChecklistTask,
  asOf: Date = new Date()
): boolean {
  if (task.reminderEnabled === false) return false;
  if (task.status !== "Pending" && task.status !== "In Progress") return false;
  if (task.escalatedAt) return false;
  // Security-critical overdue offboarding tasks escalate immediately
  if (
    task.securityCritical &&
    task.processType === "Offboarding" &&
    task.dueDate &&
    isPastDueDate(task.dueDate, asOf)
  ) {
    return true;
  }
  if (!task.escalationDueAt) return false;
  return isOnOrAfter(asOf, task.escalationDueAt);
}

export function initReminderFieldsFromTemplate(
  tmpl: {
    reminderEnabled: boolean;
    firstReminderAfterWorkingDays: number;
    reminderFrequencyWorkingDays: number;
    maximumReminderCount: number;
    escalationAfterWorkingDays: number;
    escalationEmailRule: EscalationEmailRule;
    fixedEscalationEmail: string;
  },
  assignedAt: string,
  blocked: boolean
): Partial<ChecklistTask> {
  if (!tmpl.reminderEnabled) {
    return {
      reminderEnabled: false,
      firstReminderAfterWorkingDays: tmpl.firstReminderAfterWorkingDays,
      reminderFrequencyWorkingDays: tmpl.reminderFrequencyWorkingDays,
      maximumReminderCount: tmpl.maximumReminderCount,
      escalationAfterWorkingDays: tmpl.escalationAfterWorkingDays,
      escalationEmailRule: tmpl.escalationEmailRule,
      fixedEscalationEmail: tmpl.fixedEscalationEmail,
      assignedAt,
      firstReminderDueAt: null,
      nextReminderDueAt: null,
      lastReminderSentAt: null,
      escalationDueAt: null,
      escalatedAt: null,
      reminderStatus: "Not Required" as ReminderStatus,
      reminderCount: 0,
      lastReminderAt: null,
      escalationStatus: "None",
    };
  }

  const first = addWorkingDaysIso(
    assignedAt,
    tmpl.firstReminderAfterWorkingDays
  );
  const escalationDue = addWorkingDaysIso(
    assignedAt,
    tmpl.escalationAfterWorkingDays
  );

  if (blocked) {
    return {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: tmpl.firstReminderAfterWorkingDays,
      reminderFrequencyWorkingDays: tmpl.reminderFrequencyWorkingDays,
      maximumReminderCount: tmpl.maximumReminderCount,
      escalationAfterWorkingDays: tmpl.escalationAfterWorkingDays,
      escalationEmailRule: tmpl.escalationEmailRule,
      fixedEscalationEmail: tmpl.fixedEscalationEmail,
      assignedAt,
      firstReminderDueAt: first,
      nextReminderDueAt: null,
      lastReminderSentAt: null,
      escalationDueAt: escalationDue,
      escalatedAt: null,
      reminderStatus: "Scheduled" as ReminderStatus,
      reminderCount: 0,
      lastReminderAt: null,
      escalationStatus: "None",
    };
  }

  return {
    reminderEnabled: true,
    firstReminderAfterWorkingDays: tmpl.firstReminderAfterWorkingDays,
    reminderFrequencyWorkingDays: tmpl.reminderFrequencyWorkingDays,
    maximumReminderCount: tmpl.maximumReminderCount,
    escalationAfterWorkingDays: tmpl.escalationAfterWorkingDays,
    escalationEmailRule: tmpl.escalationEmailRule,
    fixedEscalationEmail: tmpl.fixedEscalationEmail,
    assignedAt,
    firstReminderDueAt: first,
    nextReminderDueAt: first,
    lastReminderSentAt: null,
    escalationDueAt: escalationDue,
    escalatedAt: null,
    reminderStatus: "Scheduled" as ReminderStatus,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
  };
}

export function restartRemindersFromUnlock(
  task: ChecklistTask,
  unlockedAt: string
): ChecklistTask {
  if (task.reminderEnabled === false || task.reminderStatus === "Stopped") {
    return task;
  }
  const firstAfter = task.firstReminderAfterWorkingDays ?? 2;
  const escAfter = task.escalationAfterWorkingDays ?? 6;
  const first = addWorkingDaysIso(unlockedAt, firstAfter);
  return {
    ...task,
    assignedAt: unlockedAt,
    firstReminderDueAt: first,
    nextReminderDueAt: first,
    escalationDueAt: addWorkingDaysIso(unlockedAt, escAfter),
    escalatedAt: null,
    reminderStatus: "Scheduled",
    escalationStatus: "None",
  };
}

export function pauseRemindersWhileBlocked(task: ChecklistTask): ChecklistTask {
  return {
    ...task,
    nextReminderDueAt: null,
  };
}

export function stopAllReminders(task: ChecklistTask): ChecklistTask {
  return {
    ...task,
    nextReminderDueAt: null,
    reminderStatus: "Stopped",
  };
}

export function stopNotStartedReminders(task: ChecklistTask): ChecklistTask {
  return {
    ...task,
    nextReminderDueAt: null,
  };
}

function buildReminderEmailHtml(args: {
  employee: Employee;
  tasks: ChecklistTask[];
  reminderNumber: number;
}): string {
  const { employee, tasks, reminderNumber } = args;
  const rows = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.title}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.responsibleTeam}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.assignedPersonName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${(t.assignedAt || "").slice(0, 10)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.dueDate}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.status}</td>
      </tr>`
    )
    .join("");

  const primary = tasks[0];
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
      <p>This is reminder <strong>#${reminderNumber}</strong> for pending onboarding work.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 8px;color:#6b7280;">Employee</td><td style="padding:4px 8px;font-weight:600;">${employee.fullName}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Start date</td><td style="padding:4px 8px;">${employee.startDate}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Responsible team</td><td style="padding:4px 8px;">${primary.responsibleTeam}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Reminder number</td><td style="padding:4px 8px;">${reminderNumber}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:6px 8px;">Task</th>
            <th style="padding:6px 8px;">Team</th>
            <th style="padding:6px 8px;">Assigned</th>
            <th style="padding:6px 8px;">Assigned date</th>
            <th style="padding:6px 8px;">Due</th>
            <th style="padding:6px 8px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;">
        <a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock reminder — not delivered via Outlook.</p>
    </div>`;
}

function buildEscalationEmailHtml(args: {
  employee: Employee;
  task: ChecklistTask;
}): string {
  const { employee, task } = args;
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
      <p><strong>Escalation:</strong> No response on a pending onboarding task.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 8px;color:#6b7280;">Employee</td><td style="padding:4px 8px;font-weight:600;">${employee.fullName}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Task</td><td style="padding:4px 8px;">${task.title}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Owner</td><td style="padding:4px 8px;">${task.assignedPersonName} · ${task.assignedEmail}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Team</td><td style="padding:4px 8px;">${task.responsibleTeam}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Due</td><td style="padding:4px 8px;">${task.dueDate}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Status</td><td style="padding:4px 8px;">${task.status}</td></tr>
      </table>
      <p style="margin-top:20px;">
        <a href="/oneflow/cases/${task.onboardingCaseId}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open OneFlow Case</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype escalation — not delivered externally.</p>
    </div>`;
}

export interface ReminderCheckSummary {
  tasksChecked: number;
  remindersGenerated: number;
  overdueNotificationsGenerated: number;
  escalationsGenerated: number;
  runId: string;
}

export class LocalReminderEngine {
  constructor(private readonly uow: UnitOfWork) {}

  evaluateReminders(asOf: Date = new Date()): ReminderCheckSummary {
    const openTasks = this.uow.tasks
      .list()
      .filter((t) => t.status !== "Completed");
    let remindersGenerated = 0;
    let overdueNotificationsGenerated = 0;
    let escalationsGenerated = 0;

    const runId = uid("run");
    const started = nowIso();
    const emails: MockEmail[] = [];

    // Group not-started reminders by recipient + employee
    type GroupKey = string;
    const notStartedGroups = new Map<
      GroupKey,
      { employee: Employee; tasks: ChecklistTask[]; to: string }
    >();

    for (const task of openTasks) {
      if (!isNotStartedReminderEligible(task, asOf)) continue;
      const employee = this.uow.employees.getById(task.employeeId);
      if (!employee) continue;
      const to = resolveAssigneeInbox(task, employee);
      const key = `${to}::${employee.id}`;
      const existing = notStartedGroups.get(key);
      if (existing) existing.tasks.push(task);
      else notStartedGroups.set(key, { employee, tasks: [task], to });
    }

    for (const group of notStartedGroups.values()) {
      const result = this.sendTaskReminder(group.tasks, group.employee, group.to, runId);
      if (result) {
        emails.push(result.email);
        remindersGenerated += 1;
      }
    }

    for (const task of openTasks) {
      // Re-read after not-started updates
      const current = this.uow.tasks.getById(task.id) ?? task;
      if (!isOverdueReminderEligible(current, asOf)) continue;
      // Avoid double-emailing the same task in the same run if already reminded as not-started
      if (isNotStartedReminderEligible(task, asOf)) continue;
      const employee = this.uow.employees.getById(current.employeeId);
      if (!employee) continue;
      const result = this.sendOverdueReminder(current, employee, runId);
      if (result) {
        emails.push(result);
        overdueNotificationsGenerated += 1;
      }
    }

    for (const task of openTasks) {
      const current = this.uow.tasks.getById(task.id) ?? task;
      if (!isEscalationEligible(current, asOf)) continue;
      const employee = this.uow.employees.getById(current.employeeId);
      if (!employee) continue;
      const result = this.escalateTask(current, employee, runId);
      if (result) {
        emails.push(result);
        escalationsGenerated += 1;
      }
    }

    if (emails.length) this.uow.mockEmails.createMany(emails);

    const run: AutomationRun = {
      id: runId,
      runNumber: `REM-${Date.now().toString(36).toUpperCase()}`,
      trigger: "Reminder check",
      employeeId: openTasks[0]?.employeeId ?? "",
      onboardingCaseId: openTasks[0]?.onboardingCaseId ?? "",
      status: "Successful",
      startedAt: started,
      endedAt: nowIso(),
      durationMs: 80,
      tasksAssigned: openTasks.length,
      emailsGenerated: emails.length,
      errorMessage: null,
      simulateFailure: false,
      steps: [
        {
          id: uid("step"),
          order: 1,
          name: "Evaluate reminders",
          status: "Successful",
          detail: `Checked ${openTasks.length} open tasks`,
          startedAt: started,
          completedAt: nowIso(),
        },
        {
          id: uid("step"),
          order: 2,
          name: "Generate reminder emails",
          status: "Successful",
          detail: `${remindersGenerated} reminder(s), ${overdueNotificationsGenerated} overdue, ${escalationsGenerated} escalation(s)`,
          startedAt: started,
          completedAt: nowIso(),
        },
      ],
    };
    this.uow.automationRuns.create(run);

    return {
      tasksChecked: openTasks.length,
      remindersGenerated,
      overdueNotificationsGenerated,
      escalationsGenerated,
      runId,
    };
  }

  sendTaskReminder(
    tasks: ChecklistTask[],
    employee: Employee,
    to: string,
    runId: string
  ): { email: MockEmail; updated: ChecklistTask[] } | null {
    if (!tasks.length) return null;
    const ts = nowIso();
    const updated: ChecklistTask[] = [];

    for (const task of tasks) {
      const count = (task.reminderCount ?? 0) + 1;
      const max = task.maximumReminderCount ?? 2;
      const freq = task.reminderFrequencyWorkingDays ?? 2;
      const next =
        count < max ? addWorkingDaysIso(ts, freq) : null;
      const nextTask: ChecklistTask = {
        ...task,
        reminderCount: count,
        lastReminderAt: ts,
        lastReminderSentAt: ts,
        nextReminderDueAt: next,
        reminderStatus: "Reminder Sent",
        escalationStatus: "Reminder Sent",
      };
      this.uow.tasks.update(nextTask);
      updated.push(nextTask);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: task.employeeId,
        onboardingCaseId: task.onboardingCaseId,
        timestamp: ts,
        actor: "Reminder Engine",
        action: "Reminder sent",
        detail: `Reminder #${count}: ${task.title} pending for ${employee.fullName}`,
      });
    }

    const reminderNumber = Math.max(...updated.map((t) => t.reminderCount));
    const titles = updated.map((t) => t.title);
    const subject =
      titles.length === 1
        ? `Reminder ${reminderNumber}: ${titles[0]} pending for ${employee.fullName}`
        : `Reminder ${reminderNumber}: ${titles.length} tasks pending for ${employee.fullName}`;

    const email: MockEmail = {
      id: uid("mail-rem"),
      automationRunId: runId,
      from: "oneflow.reminders@ppg-demo.com",
      to,
      cc: ["admin@ppg-demo.com"],
      subject,
      htmlBody: buildReminderEmailHtml({
        employee,
        tasks: updated,
        reminderNumber,
      }),
      sentAt: ts,
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: updated[0].onboardingCaseId,
      responsibleTeam: updated[0].responsibleTeam,
    };

    return { email, updated };
  }

  sendOverdueReminder(
    task: ChecklistTask,
    employee: Employee,
    runId: string
  ): MockEmail | null {
    const ts = nowIso();
    const to = resolveAssigneeInbox(task, employee);
    const email: MockEmail = {
      id: uid("mail-od"),
      automationRunId: runId,
      from: "oneflow.reminders@ppg-demo.com",
      to,
      cc: ["admin@ppg-demo.com"],
      subject: `Overdue: ${task.title} for ${employee.fullName}`,
      htmlBody: buildReminderEmailHtml({
        employee,
        tasks: [task],
        reminderNumber: task.reminderCount || 1,
      }),
      sentAt: ts,
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: task.onboardingCaseId,
      responsibleTeam: task.responsibleTeam,
    };
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: ts,
      actor: "Reminder Engine",
      action: "Overdue reminder sent",
      detail: `${task.title} is overdue for ${employee.fullName}`,
    });
    return email;
  }

  escalateTask(
    task: ChecklistTask,
    employee: Employee,
    runId: string,
    force = false
  ): MockEmail | null {
    if (!force && task.escalatedAt) return null;
    const ts = nowIso();
    const to = resolveAssigneeInbox(task, employee);
    const ccBase = resolveEscalationCc(task, employee);
    const securityCritical = Boolean(task.securityCritical);
    const cc = [
      ccBase,
      "admin@ppg-demo.com",
      ...(securityCritical ? ["hr@ppg-demo.com"] : []),
    ].filter(
      (v, i, a) => a.indexOf(v) === i && v.toLowerCase() !== to.toLowerCase()
    );
    const next: ChecklistTask = {
      ...task,
      escalatedAt: ts,
      reminderStatus: "Escalated",
      escalationStatus: "Escalated",
      nextReminderDueAt: null,
      priority: securityCritical ? "Critical" : task.priority,
    };
    this.uow.tasks.update(next);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId || "",
      offboardingCaseId: task.offboardingCaseId ?? null,
      timestamp: ts,
      actor: "Reminder Engine",
      action: securityCritical
        ? "Security-critical task escalated"
        : "Task escalated",
      detail: securityCritical
        ? `${task.title} security-critical overdue — Admin and HR notified.`
        : `${task.title} escalated after no response.`,
    });

    if (task.offboardingCaseId) {
      const off = this.uow.offboardingCases.getById(task.offboardingCaseId);
      if (off && off.riskLevel !== "Critical") {
        const risk =
          securityCritical && isPastDueDate(task.dueDate)
            ? "Critical"
            : "Security Risk";
        this.uow.offboardingCases.update({
          ...off,
          riskLevel: risk,
          updatedAt: ts,
        });
      }
    }

    return {
      id: uid("mail-esc"),
      automationRunId: runId,
      from: "oneflow.escalations@ppg-demo.com",
      to,
      cc,
      subject: securityCritical
        ? `CRITICAL Escalation: ${task.title} for ${employee.fullName}`
        : `Escalation: ${task.title} pending for ${employee.fullName}`,
      htmlBody: buildEscalationEmailHtml({ employee, task: next }),
      sentAt: ts,
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: task.offboardingCaseId || task.onboardingCaseId,
      responsibleTeam: task.responsibleTeam,
    };
  }

  stopTaskReminders(taskId: string, actor: string): ChecklistTask | undefined {
    const task = this.uow.tasks.getById(taskId);
    if (!task) return undefined;
    const next = stopAllReminders(task);
    this.uow.tasks.update(next);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: nowIso(),
      actor,
      action: "Reminders stopped",
      detail: `${task.title} reminders stopped by ${actor}.`,
    });
    return next;
  }
}
