import { TEAM_INBOX_EMAIL } from "./auth-accounts";
import { addDays, matchAssignmentRule } from "./checklist";
import { applyDependencyGraph } from "./dependencies";
import {
  initReminderFieldsFromTemplate,
} from "./automation/reminder-engine";
import type { UnitOfWork } from "./repositories/interfaces";
import { TEMPLATE_GROUP_TO_CASE_GROUP } from "./template-types";
import { sortTemplates } from "./template-validation";
import type {
  ChecklistTask,
  Employee,
  TaskStatus,
} from "./types";
import type {
  OffboardingCase,
  OffboardingCaseStatus,
  OffboardingRiskLevel,
} from "./offboarding-types";
import type { AutomationRun, MockEmail } from "./auth-types";
import { RESPONSIBLE_TEAMS } from "./checklist";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function generateOffboardingChecklistTasks(
  employee: Employee,
  caseId: string,
  uow: UnitOfWork,
  options: { immediate: boolean; lastWorkingDate: string }
): ChecklistTask[] {
  const templates = sortTemplates(
    uow.checklistTemplates
      .listActive()
      .filter((t) => t.processType === "Offboarding")
  );
  const rules = uow.assignmentRules.listActive();
  const templateToTaskId = new Map<string, string>();
  const assignedAt = nowIso();
  const lastDay = options.lastWorkingDate;
  const execAt = `${lastDay}T18:00:00.000Z`;

  const draft = templates.map((tmpl) => {
    const taskId = uid("tsk");
    templateToTaskId.set(tmpl.id, taskId);
    const ruleMatch = matchAssignmentRule(rules, tmpl.title, employee);
    let assignedEmail = "";
    let assignedPersonName = "Unassigned";
    if (tmpl.assignedEmailRule === "Employee Manager Email") {
      assignedEmail = employee.managerEmail;
      assignedPersonName = employee.managerName || "Hiring Manager";
    } else {
      assignedEmail = tmpl.fixedAssignedEmail || ruleMatch?.assignedEmail || "";
      assignedPersonName =
        ruleMatch?.assignedPersonName || tmpl.responsibleTeam;
    }

    const securityCritical = Boolean(tmpl.securityCritical);
    let executionMode = tmpl.executionMode ?? null;
    let executionDateTime: string | null = null;
    let executionStatus: ChecklistTask["executionStatus"] = "Not Scheduled";

    if (securityCritical && executionMode === "Scheduled") {
      if (options.immediate) {
        executionMode = "Immediate";
        executionDateTime = assignedAt;
        executionStatus = "Ready";
      } else {
        executionDateTime = execAt;
        executionStatus = "Scheduled";
      }
    } else if (options.immediate && securityCritical) {
      executionMode = "Immediate";
      executionDateTime = assignedAt;
      executionStatus = "Ready";
    }

    const priority =
      options.immediate && securityCritical
        ? ("Critical" as const)
        : ("High" as const);

    return {
      id: taskId,
      employeeId: employee.id,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      processType: "Offboarding" as const,
      group: TEMPLATE_GROUP_TO_CASE_GROUP[tmpl.checklistGroup],
      title: tmpl.title,
      description: tmpl.description,
      status: "Pending" as TaskStatus,
      priority,
      assignedOwner: assignedPersonName,
      responsibleTeam: tmpl.responsibleTeam,
      assignedPersonName,
      assignedEmail,
      dueDate: addDays(lastDay, tmpl.dueOffsetDays),
      completedAt: null,
      notes: "",
      notificationStatus: "Not Sent" as const,
      notificationSentAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      escalationStatus: "None" as const,
      sourceSystem: "PeopleHub" as const,
      dependencyTaskIds: [] as string[],
      blockedReason: null as string | null,
      unlockedAt: null as string | null,
      required: tmpl.required,
      sortOrder: tmpl.sortOrder,
      templateTaskId: tmpl.id,
      securityCritical,
      executionMode,
      executionDateTime,
      executionStatus,
    };
  });

  const withDeps = draft.map((task, index) => {
    const tmpl = templates[index];
    const dependencyTaskIds = (tmpl?.dependencyTemplateTaskIds ?? [])
      .map((id) => templateToTaskId.get(id))
      .filter(Boolean) as string[];
    return { ...task, dependencyTaskIds };
  });

  // Immediate access removal: drop schedule gate on disable email by not adding
  // a synthetic time dependency — unlock security-critical tasks that only wait
  // on Confirm last working date when immediate.
  let graphed = applyDependencyGraph(withDeps);

  if (options.immediate) {
    graphed = graphed.map((t) => {
      if (!t.securityCritical) return t;
      if (t.status !== "Blocked") return t;
      // Keep blocked only if non-schedule prerequisites incomplete
      const unmet = (t.dependencyTaskIds ?? [])
        .map((id) => graphed.find((x) => x.id === id))
        .filter((p) => p && p.status !== "Completed");
      if (unmet.length) return t;
      return {
        ...t,
        status: "Pending" as TaskStatus,
        blockedReason: null,
        unlockedAt: assignedAt,
        executionMode: "Immediate" as const,
        executionStatus: "Ready" as const,
        priority: "Critical" as const,
      };
    });
  }

  return graphed.map((task, index) => {
    const tmpl = templates[index];
    const reminder = initReminderFieldsFromTemplate(
      {
        reminderEnabled: tmpl.reminderEnabled,
        firstReminderAfterWorkingDays: tmpl.firstReminderAfterWorkingDays,
        reminderFrequencyWorkingDays: tmpl.reminderFrequencyWorkingDays,
        maximumReminderCount: tmpl.maximumReminderCount,
        escalationAfterWorkingDays: tmpl.escalationAfterWorkingDays,
        escalationEmailRule: tmpl.escalationEmailRule,
        fixedEscalationEmail: tmpl.fixedEscalationEmail,
      },
      assignedAt,
      task.status === "Blocked"
    );
    return { ...task, ...reminder };
  });
}

export function calculateOffboardingRisk(
  employee: Employee,
  tasks: ChecklistTask[],
  lastWorkingDate: string
): OffboardingRiskLevel {
  const today = new Date().toISOString().slice(0, 10);
  const pastLastDay = lastWorkingDate < today;

  const laptop = tasks.find((t) => t.title === "Recover laptop");
  const network = tasks.find((t) =>
    t.title.toLowerCase().includes("network id")
  );
  const building = tasks.find((t) => t.title === "Disable building access");
  const email = tasks.find((t) => t.title === "Disable email account");

  const accessStillActive = (t?: ChecklistTask) =>
    Boolean(t && t.status !== "Completed" && t.status !== "Blocked");

  if (
    pastLastDay &&
    (accessStillActive(network) ||
      accessStillActive(building) ||
      accessStillActive(email))
  ) {
    return "Critical";
  }
  if (pastLastDay && laptop && laptop.status !== "Completed") {
    return "Security Risk";
  }
  const overdueAsset = tasks.some(
    (t) =>
      (t.title.toLowerCase().includes("recover") ||
        t.title.toLowerCase().includes("asset")) &&
      t.status !== "Completed" &&
      t.status !== "Blocked" &&
      Boolean(t.dueDate) &&
      t.dueDate < today
  );
  if (overdueAsset) return "Attention Required";
  return "Normal";
}

export function deriveOffboardingCaseStatus(
  tasks: ChecklistTask[],
  lastWorkingDate: string,
  current?: OffboardingCaseStatus
): OffboardingCaseStatus {
  if (current === "Cancelled") return "Cancelled";
  const required = tasks.filter((t) => t.required !== false);
  if (required.length && required.every((t) => t.status === "Completed")) {
    return "Completed";
  }
  const today = new Date().toISOString().slice(0, 10);
  const accessTasks = tasks.filter((t) => t.securityCritical);
  const accessInProgress = accessTasks.some(
    (t) => t.status === "In Progress" || t.status === "Completed"
  );
  const clearancePending = tasks.some(
    (t) =>
      t.title.includes("site exit") ||
      t.title.includes("asset inventory") ||
      t.title.includes("handover")
  );

  if (lastWorkingDate > today && !accessInProgress) {
    const anyStarted = tasks.some(
      (t) => t.status === "In Progress" || t.status === "Completed"
    );
    return anyStarted ? "In Progress" : "Scheduled";
  }
  if (lastWorkingDate === today || lastWorkingDate < today) {
    if (
      accessTasks.some(
        (t) => t.status !== "Completed" && t.status !== "Blocked"
      )
    ) {
      return lastWorkingDate < today
        ? "Access Removal In Progress"
        : "Awaiting Last Day";
    }
    if (clearancePending) return "Clearance Pending";
  }
  return "In Progress";
}

export function buildOffboardingDepartmentEmails(args: {
  employee: Employee;
  caseId: string;
  tasks: ChecklistTask[];
  runId: string;
  immediate: boolean;
}): MockEmail[] {
  const { employee, caseId, tasks, runId, immediate } = args;
  const emails: MockEmail[] = [];
  for (const team of RESPONSIBLE_TEAMS) {
    const teamTasks = tasks.filter((t) => t.responsibleTeam === team);
    if (!teamTasks.length) continue;
    const to =
      team === "Hiring Manager"
        ? employee.managerEmail === "manager@ppg-demo.com"
          ? "manager@ppg-demo.com"
          : employee.managerEmail || TEAM_INBOX_EMAIL[team]
        : TEAM_INBOX_EMAIL[team];
    const subject = immediate
      ? `URGENT OneFlow: Immediate offboarding access removal for ${employee.fullName}`
      : `OneFlow: Offboarding tasks for ${employee.fullName}`;
    const rows = teamTasks
      .map(
        (t) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.title}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.dueDate}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.status}</td></tr>`
      )
      .join("");
    emails.push({
      id: uid("mail-off"),
      automationRunId: runId,
      from: "oneflow.offboarding@ppg-demo.com",
      to,
      cc: ["admin@ppg-demo.com", "hr@ppg-demo.com"],
      subject,
      htmlBody: `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
          <p>Hello ${team},</p>
          <p>${immediate ? "<strong>Immediate access removal has been requested.</strong>" : "OneFlow has assigned offboarding tasks."}</p>
          <p>Employee: <strong>${employee.fullName}</strong> · Last working day: <strong>${employee.lastWorkingDate || "—"}</strong></p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
            <thead><tr style="background:#f3f4f6;text-align:left;"><th style="padding:6px 8px;">Task</th><th style="padding:6px 8px;">Due</th><th style="padding:6px 8px;">Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:20px;"><a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a></p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
        </div>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      responsibleTeam: team,
    });
  }
  return emails;
}

export function recordOffboardingAutomationRun(args: {
  uow: UnitOfWork;
  employee: Employee;
  caseId: string;
  taskCount: number;
  emailCount: number;
  immediate: boolean;
}): string {
  const runId = uid("run");
  const started = nowIso();
  const run: AutomationRun = {
    id: runId,
    runNumber: `OFF-${Date.now().toString(36).toUpperCase()}`,
    trigger: args.immediate
      ? "Immediate offboarding access removal"
      : "Offboarding case created",
    employeeId: args.employee.id,
    onboardingCaseId: args.caseId,
    status: "Successful",
    startedAt: started,
    endedAt: nowIso(),
    durationMs: 100,
    tasksAssigned: args.taskCount,
    emailsGenerated: args.emailCount,
    errorMessage: null,
    simulateFailure: false,
    steps: [
      {
        id: uid("step"),
        order: 1,
        name: "Offboarding case created",
        status: "Successful",
        detail: `${args.taskCount} tasks generated`,
        startedAt: started,
        completedAt: nowIso(),
      },
      {
        id: uid("step"),
        order: 2,
        name: "Department notifications",
        status: "Successful",
        detail: `${args.emailCount} mock emails generated`,
        startedAt: started,
        completedAt: nowIso(),
      },
    ],
  };
  args.uow.automationRuns.create(run);
  return runId;
}

export function progressForTasks(tasks: ChecklistTask[]): number {
  if (!tasks.length) return 0;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  return Math.round((completed / tasks.length) * 100);
}

export function refreshOffboardingCaseProgress(
  uow: UnitOfWork,
  caseId: string
): OffboardingCase | undefined {
  const onb = uow.offboardingCases.getById(caseId);
  if (!onb) return undefined;
  const employee = uow.employees.getById(onb.employeeId);
  const tasks = uow.tasks.list().filter((t) => t.offboardingCaseId === caseId);
  const overallProgress = progressForTasks(tasks);
  const riskLevel = employee
    ? calculateOffboardingRisk(employee, tasks, onb.lastWorkingDate)
    : onb.riskLevel;
  const status = deriveOffboardingCaseStatus(
    tasks,
    onb.lastWorkingDate,
    onb.status
  );
  const updated: OffboardingCase = {
    ...onb,
    overallProgress,
    riskLevel,
    status,
    updatedAt: nowIso(),
    completedAt: status === "Completed" ? onb.completedAt || nowIso() : null,
  };
  uow.offboardingCases.update(updated);
  if (employee) {
    uow.employees.update({
      ...employee,
      offboardingStatus: status,
      updatedAt: nowIso(),
    });
  }
  return updated;
}

/** Mock lifecycle emails for reminders / demo scenarios. */
export function buildOffboardingEventEmail(args: {
  employee: Employee;
  caseId: string;
  kind:
    | "upcoming-last-day"
    | "asset-return-reminder"
    | "scheduled-access-removal"
    | "immediate-access-removal"
    | "overdue-access-removal"
    | "completed";
  to?: string;
  runId?: string;
}): MockEmail {
  const { employee, caseId, kind } = args;
  const subjects: Record<typeof kind, string> = {
    "upcoming-last-day": `OneFlow: Upcoming last working date for ${employee.fullName}`,
    "asset-return-reminder": `OneFlow: Asset return reminder — ${employee.fullName}`,
    "scheduled-access-removal": `OneFlow: Scheduled access removal — ${employee.fullName}`,
    "immediate-access-removal": `URGENT OneFlow: Immediate access removal — ${employee.fullName}`,
    "overdue-access-removal": `CRITICAL OneFlow: Overdue access removal — ${employee.fullName}`,
    completed: `OneFlow: Offboarding completed — ${employee.fullName}`,
  };
  const bodies: Record<typeof kind, string> = {
    "upcoming-last-day": `Last working day is ${employee.lastWorkingDate || "—"}. Complete remaining clearance tasks.`,
    "asset-return-reminder": `Please recover company assets (laptop, phone, accessories) before or on the last working day.`,
    "scheduled-access-removal": `Access-removal tasks are scheduled for ${employee.lastWorkingDate || "last working day"} at 18:00 UTC (mock).`,
    "immediate-access-removal": `Immediate access removal has been requested. Complete security-critical tasks now.`,
    "overdue-access-removal": `Last working day has passed and critical access remains active. Escalate immediately.`,
    completed: `All required offboarding tasks are complete for ${employee.fullName}.`,
  };
  return {
    id: uid("mail-off-evt"),
    automationRunId: args.runId || "",
    from: "oneflow.offboarding@ppg-demo.com",
    to: args.to || "admin@ppg-demo.com",
    cc: ["hr@ppg-demo.com", "admin@ppg-demo.com"],
    subject: subjects[kind],
    htmlBody: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
        <p>${bodies[kind]}</p>
        <p>Employee: <strong>${employee.fullName}</strong></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
      </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    responsibleTeam: "HR Operations",
  };
}
