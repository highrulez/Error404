import { CHECKLIST_GROUPS } from "../checklist";
import type { UnitOfWork } from "../repositories/interfaces";
import type {
  CaseProgressSummary,
  ChecklistTask,
  GroupProgress,
  ResponsibleTeam,
} from "../types";
import {
  buildNewHireAutomationPayload,
  type NewHireAutomationPayload,
} from "./payload";

export interface AutomationResult {
  ok: boolean;
  message: string;
  payload?: NewHireAutomationPayload;
  mode: "simulation" | "live";
}

export interface AutomationService {
  triggerNewHireWorkflow(caseId: string): Promise<AutomationResult>;
  notifyResponsibleTeams(
    caseId: string,
    teams?: ResponsibleTeam[]
  ): Promise<AutomationResult>;
  retryFailedNotification(
    caseId: string,
    responsibleTeam?: ResponsibleTeam
  ): Promise<AutomationResult>;
  simulateReminder(caseId: string): Promise<AutomationResult>;
  recalculateProgress(caseId: string): CaseProgressSummary;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function calculateCaseProgress(tasks: ChecklistTask[]): CaseProgressSummary {
  const total = tasks.length;
  let completedCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let inProgressCount = 0;
  let blockedCount = 0;

  const byGroupMap = new Map<string, GroupProgress>();
  for (const g of CHECKLIST_GROUPS) {
    byGroupMap.set(g, {
      group: g,
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      percent: 0,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const t of tasks) {
    const g = byGroupMap.get(t.group)!;
    g.total += 1;

    let status = t.status;
    if (
      status !== "Completed" &&
      status !== "Blocked" &&
      t.dueDate &&
      t.dueDate < today
    ) {
      status = "Overdue";
    }

    switch (status) {
      case "Completed":
        completedCount += 1;
        g.completed += 1;
        break;
      case "Overdue":
        overdueCount += 1;
        g.overdue += 1;
        break;
      case "In Progress":
        inProgressCount += 1;
        break;
      case "Blocked":
        blockedCount += 1;
        break;
      default:
        pendingCount += 1;
        g.pending += 1;
        break;
    }
  }

  const byGroup = CHECKLIST_GROUPS.map((name) => {
    const g = byGroupMap.get(name)!;
    return {
      ...g,
      percent: g.total ? Math.round((g.completed / g.total) * 100) : 0,
    };
  });

  return {
    overallProgress: total ? Math.round((completedCount / total) * 100) : 0,
    completedCount,
    pendingCount,
    overdueCount,
    inProgressCount,
    blockedCount,
    byGroup,
  };
}

/**
 * Simulation-first automation. Live mode prepares the payload but does not
 * call Power Automate until a server URL/credentials are configured in Phase 2.
 */
export class LocalAutomationService implements AutomationService {
  constructor(private readonly uow: UnitOfWork) {}

  recalculateProgress(caseId: string): CaseProgressSummary {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const summary = calculateCaseProgress(tasks);
    const existing = this.uow.onboardingCases.getById(caseId);
    if (existing) {
      this.uow.onboardingCases.update({
        ...existing,
        overallProgress: summary.overallProgress,
        status:
          summary.overallProgress === 100
            ? "Completed"
            : summary.overallProgress === 0
              ? "Not Started"
              : "In Progress",
        updatedAt: nowIso(),
      });
      this.uow.persist();
    }
    return summary;
  }

  private buildPayload(caseId: string) {
    const onboardingCase = this.uow.onboardingCases.getById(caseId);
    if (!onboardingCase) throw new Error("Onboarding case not found");
    const employee = this.uow.employees.getById(onboardingCase.employeeId);
    if (!employee) throw new Error("Employee not found");
    const tasks = this.uow.tasks.listByCaseId(caseId);
    return {
      employee,
      onboardingCase,
      tasks,
      payload: buildNewHireAutomationPayload({
        employee,
        onboardingCase,
        tasks,
      }),
    };
  }

  private markTeamNotifications(
    caseId: string,
    teams: ResponsibleTeam[] | undefined,
    status: "Sent" | "Simulated" | "Failed" | "Pending",
    error?: string
  ) {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const ts = nowIso();
    const updated = tasks.map((t) => {
      if (teams && !teams.includes(t.responsibleTeam)) return t;
      if (status === "Failed") {
        return {
          ...t,
          notificationStatus: "Failed" as const,
        };
      }
      return {
        ...t,
        notificationStatus: status,
        notificationSentAt: status === "Pending" ? t.notificationSentAt : ts,
      };
    });
    this.uow.tasks.updateMany(updated);

    const onb = this.uow.onboardingCases.getById(caseId);
    if (onb) {
      this.uow.onboardingCases.update({
        ...onb,
        lastWorkflowTriggeredAt: ts,
        lastWorkflowError: error ?? null,
        updatedAt: ts,
      });
    }

    const employeeId = onb?.employeeId ?? tasks[0]?.employeeId ?? "";
    this.uow.activity.create({
      id: uid("act"),
      employeeId,
      onboardingCaseId: caseId,
      timestamp: ts,
      actor: "AutomationService",
      action:
        status === "Failed"
          ? "Notification failed"
          : status === "Simulated"
            ? "Notifications simulated"
            : "Notifications sent",
      detail: error
        ? error
        : `Teams: ${(teams ?? [...new Set(tasks.map((t) => t.responsibleTeam))]).join(", ")}`,
    });
    this.uow.persist();
  }

  async triggerNewHireWorkflow(caseId: string): Promise<AutomationResult> {
    const mode = this.uow.getAutomationMode();
    const { payload, onboardingCase } = this.buildPayload(caseId);

    // Mark pending then complete
    this.markTeamNotifications(caseId, undefined, "Pending");

    if (mode === "simulation") {
      await new Promise((r) => setTimeout(r, 600));
      this.markTeamNotifications(caseId, undefined, "Simulated");
      this.uow.activity.create({
        id: uid("act"),
        employeeId: onboardingCase.employeeId,
        onboardingCaseId: caseId,
        timestamp: nowIso(),
        actor: "AutomationService",
        action: "New hire workflow triggered",
        detail: "Simulation Mode · Power Automate payload prepared (not sent)",
      });
      this.uow.persist();
      return {
        ok: true,
        mode,
        message:
          "Simulation Mode: NewHireOnboardingCreated payload built. No external call.",
        payload,
      };
    }

    // Live mode — prepared for Phase 2; do not expose secrets or call fake APIs
    // TODO: POST payload to server-side Power Automate proxy (POWER_AUTOMATE_URL)
    this.markTeamNotifications(
      caseId,
      undefined,
      "Failed",
      "Live Automation is not connected yet. Configure Power Automate in Phase 2, or switch to Simulation Mode."
    );
    return {
      ok: false,
      mode,
      message:
        "Live Automation is not connected yet. No credentials used. Switch to Simulation Mode.",
      payload,
    };
  }

  async notifyResponsibleTeams(
    caseId: string,
    teams?: ResponsibleTeam[]
  ): Promise<AutomationResult> {
    const mode = this.uow.getAutomationMode();
    const { payload } = this.buildPayload(caseId);
    this.markTeamNotifications(caseId, teams, "Pending");

    if (mode === "simulation") {
      await new Promise((r) => setTimeout(r, 400));
      this.markTeamNotifications(caseId, teams, "Simulated");
      return {
        ok: true,
        mode,
        message: "Simulation Mode: responsible team notifications recorded.",
        payload,
      };
    }

    // TODO: Phase 2 — send filtered taskGroups via Power Automate
    this.markTeamNotifications(
      caseId,
      teams,
      "Failed",
      "Live Automation is not connected yet."
    );
    return {
      ok: false,
      mode,
      message: "Live Automation is not connected yet. Switch to Simulation Mode.",
      payload,
    };
  }

  async retryFailedNotification(
    caseId: string,
    responsibleTeam?: ResponsibleTeam
  ): Promise<AutomationResult> {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const teams = responsibleTeam
      ? [responsibleTeam]
      : [
          ...new Set(
            tasks
              .filter((t) => t.notificationStatus === "Failed")
              .map((t) => t.responsibleTeam)
          ),
        ];
    if (teams.length === 0) {
      return this.triggerNewHireWorkflow(caseId);
    }
    return this.notifyResponsibleTeams(caseId, teams);
  }

  async simulateReminder(caseId: string): Promise<AutomationResult> {
    const tasks = this.uow.tasks.listByCaseId(caseId);
    const ts = nowIso();
    const updated = tasks.map((t) => {
      if (t.status === "Completed") return t;
      return {
        ...t,
        reminderCount: t.reminderCount + 1,
        lastReminderAt: ts,
        escalationStatus: "Reminder Sent" as const,
      };
    });
    this.uow.tasks.updateMany(updated);
    const onb = this.uow.onboardingCases.getById(caseId);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: onb?.employeeId ?? "",
      onboardingCaseId: caseId,
      timestamp: ts,
      actor: "AutomationService",
      action: "Reminder simulated",
      detail: `Reminders queued for ${updated.filter((t) => t.status !== "Completed").length} open tasks`,
    });
    this.uow.persist();
    return {
      ok: true,
      mode: "simulation",
      message: "Reminder simulation recorded for open tasks.",
    };
  }
}
