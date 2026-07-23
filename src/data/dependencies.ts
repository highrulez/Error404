import { TEAM_INBOX_EMAIL } from "./auth-accounts";
import type { ChecklistTask, Employee, TaskStatus } from "./types";
import type { MockEmail } from "./auth-types";

/** Prerequisite titles keyed by dependent task title. */
export const TASK_DEPENDENCY_TITLES: Record<string, string[]> = {
  "Create Email": ["Create Network ID"],
  "SailPoint Access": ["Create Email"],
  "Laptop Assigned": [
    "Create Network ID",
    "Create Email",
    "SailPoint Access",
  ],
  "Software Installed": ["Laptop Assigned"],
};

export function unmetPrerequisiteTitles(
  task: ChecklistTask,
  allTasks: ChecklistTask[]
): string[] {
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const deps =
    task.dependencyTaskIds?.length
      ? task.dependencyTaskIds
          .map((id) => byId.get(id)?.title)
          .filter(Boolean) as string[]
      : TASK_DEPENDENCY_TITLES[task.title] ?? [];

  return deps.filter((title) => {
    const prereq = allTasks.find((t) => t.title === title);
    return !prereq || prereq.status !== "Completed";
  });
}

export function isTaskBlockedByDependencies(
  task: ChecklistTask,
  allTasks: ChecklistTask[]
): boolean {
  return unmetPrerequisiteTitles(task, allTasks).length > 0;
}

export function blockedReasonFor(
  task: ChecklistTask,
  allTasks: ChecklistTask[]
): string {
  const unmet = unmetPrerequisiteTitles(task, allTasks);
  if (!unmet.length) return "";
  return `Waiting for: ${unmet.join(", ")}`;
}

/**
 * Apply dependency graph after generation: wire IDs (legacy title map if unset)
 * and set Blocked/Pending. Preserves explicit dependencyTaskIds from templates.
 */
export function applyDependencyGraph(tasks: ChecklistTask[]): ChecklistTask[] {
  const byTitle = new Map(tasks.map((t) => [t.title, t]));

  return tasks.map((task) => {
    const hasExplicitDeps = (task.dependencyTaskIds?.length ?? 0) > 0;
    const prereqTitles = TASK_DEPENDENCY_TITLES[task.title] ?? [];
    const dependencyTaskIds = hasExplicitDeps
      ? task.dependencyTaskIds
      : (prereqTitles
          .map((title) => byTitle.get(title)?.id)
          .filter(Boolean) as string[]);

    const withDeps: ChecklistTask = {
      ...task,
      dependencyTaskIds,
      blockedReason: task.blockedReason ?? null,
      unlockedAt: task.unlockedAt ?? null,
    };

    const unmet = unmetPrerequisiteTitles(withDeps, tasks);
    if (unmet.length > 0) {
      return {
        ...withDeps,
        status: "Blocked" as TaskStatus,
        blockedReason: `Waiting for: ${unmet.join(", ")}`,
        unlockedAt: null,
      };
    }
    return {
      ...withDeps,
      status: task.status === "Blocked" ? "Pending" : task.status,
      blockedReason: null,
    };
  });
}

export function buildUnlockEmail(args: {
  employee: Employee;
  onboardingCaseId: string;
  unlockedTasks: ChecklistTask[];
  automationRunId: string;
}): MockEmail | null {
  const { employee, onboardingCaseId, unlockedTasks, automationRunId } = args;
  if (!unlockedTasks.length) return null;

  const team = unlockedTasks[0].responsibleTeam;
  const to =
    team === "Hiring Manager"
      ? employee.managerEmail === "manager@ppg-demo.com"
        ? "manager@ppg-demo.com"
        : employee.managerEmail || TEAM_INBOX_EMAIL[team]
      : TEAM_INBOX_EMAIL[team];

  const titles = unlockedTasks.map((t) => t.title);
  const isOnsite =
    team === "Onsite IT Support" &&
    titles.some((t) => t === "Laptop Assigned" || t === "Software Installed");

  // When IT Security unlocks Laptop Assigned, notify Onsite IT that their
  // stream (including Software Installed) is ready to begin.
  const emailTitles =
    isOnsite && titles.includes("Laptop Assigned") && !titles.includes("Software Installed")
      ? ["Laptop Assigned", "Software Installed"]
      : titles;

  const subject = isOnsite
    ? `OneFlow: Onsite IT tasks are ready for ${employee.fullName}`
    : `OneFlow: ${team} tasks unlocked for ${employee.fullName}`;

  const list = emailTitles.map((t) => `<li>${t}</li>`).join("");
  const htmlBody = isOnsite
    ? `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
        <p>Hello Onsite IT Support,</p>
        <p><strong>IT Security prerequisites are complete.</strong></p>
        <p>You may now begin:</p>
        <ul>${list}</ul>
        <p>Employee: <strong>${employee.fullName}</strong> · ${employee.role} · ${employee.department}</p>
        <p style="margin-top:20px;">
          <a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
      </div>`
    : `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
        <p>Hello ${team},</p>
        <p>Prerequisite tasks are complete. The following tasks are now available:</p>
        <ul>${list}</ul>
        <p>Employee: <strong>${employee.fullName}</strong></p>
        <p style="margin-top:20px;">
          <a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a>
        </p>
      </div>`;

  return {
    id: `mail-unlock-${Math.random().toString(36).slice(2, 9)}`,
    automationRunId,
    from: "oneflow.automation@ppg-demo.com",
    to,
    cc: ["admin@ppg-demo.com"],
    subject,
    htmlBody,
    sentAt: new Date().toISOString(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId,
    responsibleTeam: team,
  };
}
