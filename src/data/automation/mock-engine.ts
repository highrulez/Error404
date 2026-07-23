import type {
  AutomationRun,
  AutomationStep,
  MockEmail,
} from "../auth-types";
import { TEAM_INBOX_EMAIL } from "../auth-accounts";
import type { UnitOfWork } from "../repositories/interfaces";
import type {
  ChecklistTask,
  Employee,
  OnboardingCase,
  ResponsibleTeam,
} from "../types";
import { RESPONSIBLE_TEAMS } from "../checklist";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const STEP_NAMES = [
  "New hire detected",
  "Onboarding case retrieved or created",
  "Checklist tasks generated",
  "Assignment rules evaluated",
  "Tasks assigned",
  "Department emails generated",
  "Activity timeline updated",
  "Workflow completed",
];

function emailSubject(team: ResponsibleTeam, employeeName: string): string {
  switch (team) {
    case "HR Operations":
      return `OneFlow: HR onboarding tasks for ${employeeName}`;
    case "IT Security":
      return `OneFlow: IT Security onboarding tasks for ${employeeName}`;
    case "Onsite IT Support":
      return `OneFlow: Onsite IT onboarding tasks for ${employeeName}`;
    case "Facilities / Building Management":
      return `OneFlow: Facilities onboarding tasks for ${employeeName}`;
    case "Hiring Manager":
      return `OneFlow: Manager onboarding tasks for ${employeeName}`;
    case "Finance / Administration":
      return `OneFlow: Finance onboarding tasks for ${employeeName}`;
    case "Corporate Card Admin":
      return `OneFlow: Corporate Card onboarding tasks for ${employeeName}`;
    case "Administration":
      return `OneFlow: Administration onboarding tasks for ${employeeName}`;
    default:
      return `OneFlow: Onboarding tasks for ${employeeName}`;
  }
}

function buildEmailHtml(args: {
  employee: Employee;
  tasks: ChecklistTask[];
  team: ResponsibleTeam;
}): string {
  const { employee, tasks, team } = args;
  const rows = tasks
    .map(
      (t) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.title}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.dueDate}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.status}</td></tr>`
    )
    .join("");
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
      <p>Hello ${team},</p>
      <p>OneFlow has assigned onboarding tasks for the following new hire.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 8px;color:#6b7280;">Employee</td><td style="padding:4px 8px;font-weight:600;">${employee.fullName}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Role</td><td style="padding:4px 8px;">${employee.role}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Department</td><td style="padding:4px 8px;">${employee.department}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Location</td><td style="padding:4px 8px;">${employee.location}</td></tr>
        <tr><td style="padding:4px 8px;color:#6b7280;">Start date</td><td style="padding:4px 8px;">${employee.startDate}</td></tr>
      </table>
      <h3 style="font-size:14px;margin:16px 0 8px;">Assigned checklist tasks</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f3f4f6;text-align:left;"><th style="padding:6px 8px;">Task</th><th style="padding:6px 8px;">Due</th><th style="padding:6px 8px;">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;">
        <a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
    </div>
  `;
}

export interface MockAutomationService {
  detectNewHire(employeeId: string): Employee | undefined;
  createOnboardingCase(employeeId: string): OnboardingCase | undefined;
  generateChecklistTasks(caseId: string): ChecklistTask[];
  assignTasks(caseId: string): number;
  generateDepartmentEmails(
    caseId: string,
    runId: string
  ): MockEmail[];
  recordAutomationRun(run: AutomationRun): void;
  processTaskStatusChange(taskId: string, detail: string): void;
  recalculateProgress(caseId: string): number;
  generateReminder(caseId: string): void;
  completeOnboarding(caseId: string): void;
  runFullWorkflow(
    caseId: string,
    options?: { simulateFailure?: boolean }
  ): Promise<{ ok: boolean; message: string; run: AutomationRun }>;
}

/**
 * Local mock of Power Automate — no external calls.
 * Replace later with real Power Automate HTTP triggers.
 */
export class LocalMockAutomationEngine implements MockAutomationService {
  constructor(
    private readonly uow: UnitOfWork & {
      mockEmails: {
        list(): MockEmail[];
        createMany(emails: MockEmail[]): void;
        replaceAll(emails: MockEmail[]): void;
        update(email: MockEmail): void;
      };
      automationRuns: {
        list(): AutomationRun[];
        getById(id: string): AutomationRun | undefined;
        create(run: AutomationRun): void;
        update(run: AutomationRun): void;
      };
    },
    private readonly recalculate: (caseId: string) => number
  ) {}

  detectNewHire(employeeId: string) {
    return this.uow.employees.getById(employeeId);
  }

  createOnboardingCase(employeeId: string) {
    return this.uow.onboardingCases.getByEmployeeId(employeeId);
  }

  generateChecklistTasks(caseId: string) {
    return this.uow.tasks.listByCaseId(caseId);
  }

  assignTasks(caseId: string) {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const updated = tasks.map((t) => ({
      ...t,
      notificationStatus: "Simulated" as const,
      notificationSentAt: nowIso(),
      sourceSystem: "Power Automate" as const,
    }));
    this.uow.tasks.updateMany(updated);
    return updated.length;
  }

  generateDepartmentEmails(caseId: string, runId: string): MockEmail[] {
    const onb = this.uow.onboardingCases.getById(caseId);
    if (!onb) return [];
    const employee = this.uow.employees.getById(onb.employeeId);
    if (!employee) return [];
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const emails: MockEmail[] = [];

    for (const team of RESPONSIBLE_TEAMS) {
      const teamTasks = tasks.filter((t) => t.responsibleTeam === team);
      if (teamTasks.length === 0) continue;
      const to =
        team === "Hiring Manager"
          ? employee.managerEmail === "manager@ppg-demo.com"
            ? "manager@ppg-demo.com"
            : employee.managerEmail || TEAM_INBOX_EMAIL[team]
          : TEAM_INBOX_EMAIL[team];
      emails.push({
        id: uid("mail"),
        automationRunId: runId,
        from: "oneflow.automation@ppg-demo.com",
        to,
        cc: ["admin@ppg-demo.com"],
        subject: emailSubject(team, employee.fullName),
        htmlBody: buildEmailHtml({ employee, tasks: teamTasks, team }),
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: employee.id,
        onboardingCaseId: caseId,
        responsibleTeam: team,
      });
    }
    this.uow.mockEmails.createMany(emails);
    return emails;
  }

  recordAutomationRun(run: AutomationRun) {
    const existing = this.uow.automationRuns.getById(run.id);
    if (existing) this.uow.automationRuns.update(run);
    else this.uow.automationRuns.create(run);
  }

  processTaskStatusChange(taskId: string, detail: string) {
    const task = this.uow.tasks.getById(taskId);
    if (!task) return;
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: nowIso(),
      actor: "MockAutomationService",
      action: "Automation event",
      detail: `processTaskStatusChange · ${detail}`,
    });
  }

  recalculateProgress(caseId: string) {
    return this.recalculate(caseId);
  }

  generateReminder(caseId: string) {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const ts = nowIso();
    this.uow.tasks.updateMany(
      tasks.map((t) =>
        t.status === "Completed"
          ? t
          : {
              ...t,
              reminderCount: t.reminderCount + 1,
              lastReminderAt: ts,
              escalationStatus: "Reminder Sent" as const,
            }
      )
    );
  }

  completeOnboarding(caseId: string) {
    const progress = this.recalculate(caseId);
    if (progress >= 100) {
      const onb = this.uow.onboardingCases.getById(caseId);
      if (onb) {
        this.uow.onboardingCases.update({
          ...onb,
          status: "Completed",
          overallProgress: 100,
          updatedAt: nowIso(),
        });
      }
    }
  }

  async runFullWorkflow(
    caseId: string,
    options?: { simulateFailure?: boolean }
  ): Promise<{ ok: boolean; message: string; run: AutomationRun }> {
    const onb = this.uow.onboardingCases.getById(caseId);
    if (!onb) {
      throw new Error("Onboarding case not found");
    }
    const employee = this.uow.employees.getById(onb.employeeId);
    if (!employee) throw new Error("Employee not found");

    const startedAt = nowIso();
    const runId = uid("run");
    const steps: AutomationStep[] = STEP_NAMES.map((name, i) => ({
      id: uid("step"),
      order: i + 1,
      name,
      status: "Pending",
      detail: "",
      startedAt: null,
      completedAt: null,
    }));

    let run: AutomationRun = {
      id: runId,
      runNumber: `PA-${Date.now().toString(36).toUpperCase()}`,
      trigger: options?.simulateFailure
        ? "Simulate Automation Failure"
        : "Run Mock Automation",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      status: "Running",
      startedAt,
      endedAt: null,
      durationMs: null,
      tasksAssigned: 0,
      emailsGenerated: 0,
      errorMessage: null,
      steps,
      simulateFailure: Boolean(options?.simulateFailure),
    };
    this.recordAutomationRun(run);
    this.uow.persist();

    await sleep(1500);

    const markStep = (index: number, detail: string, failed = false) => {
      const ts = nowIso();
      run = {
        ...run,
        steps: run.steps.map((s, i) =>
          i === index
            ? {
                ...s,
                status: failed ? "Failed" : "Successful",
                detail,
                startedAt: ts,
                completedAt: ts,
              }
            : s
        ),
      };
    };

    // Steps 1–4
    this.detectNewHire(employee.id);
    markStep(0, `Detected ${employee.fullName} as New Hire`);
    this.createOnboardingCase(employee.id);
    markStep(1, `Case ${onb.caseNumber}`);
    const tasks = this.generateChecklistTasks(caseId);
    markStep(2, `${tasks.length} checklist tasks present`);
    markStep(3, "Assignment rules applied from local matrix");

    if (options?.simulateFailure) {
      markStep(4, "Simulated failure before task assignment", true);
      const endedAt = nowIso();
      run = {
        ...run,
        status: "Failed",
        endedAt,
        durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
        errorMessage:
          "Simulated Power Automate failure — employee and checklist data retained.",
        steps: run.steps.map((s, i) =>
          i > 4 ? s : i === 4 ? s : { ...s, status: s.status === "Pending" ? "Successful" : s.status }
        ),
      };
      // Mark remaining as pending
      run = {
        ...run,
        steps: run.steps.map((s) =>
          s.status === "Pending" ? { ...s, status: "Pending" as const } : s
        ),
      };
      this.recordAutomationRun(run);
      this.uow.activity.create({
        id: uid("act"),
        employeeId: employee.id,
        onboardingCaseId: caseId,
        timestamp: nowIso(),
        actor: "MockAutomationService",
        action: "Automation run failed",
        detail: run.errorMessage || "Failed",
      });
      this.uow.persist();
      return {
        ok: false,
        message: run.errorMessage || "Automation failed",
        run,
      };
    }

    const assigned = this.assignTasks(caseId);
    markStep(4, `${assigned} tasks assigned to responsible teams`);
    run = { ...run, tasksAssigned: assigned };

    const emails = this.generateDepartmentEmails(caseId, runId);
    markStep(5, `${emails.length} department emails generated`);
    run = { ...run, emailsGenerated: emails.length };

    this.uow.activity.create({
      id: uid("act"),
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "MockAutomationService",
      action: "Mock automation completed",
      detail: `${run.runNumber} · ${assigned} tasks · ${emails.length} emails`,
    });
    markStep(6, "Activity timeline updated");

    this.recalculateProgress(caseId);
    markStep(7, "Workflow completed successfully");

    const endedAt = nowIso();
    run = {
      ...run,
      status: "Successful",
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
    };
    this.recordAutomationRun(run);
    this.uow.persist();

    return {
      ok: true,
      message: `Automation ${run.runNumber} completed successfully.`,
      run,
    };
  }
}
