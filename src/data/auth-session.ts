import {
  DEMO_USERS,
  ROLE_TO_TEAM,
  TEAM_ASSIGNED_EMAIL,
  TEAM_INBOX_EMAIL,
  findDemoUser,
  SESSION_STORAGE_KEY,
} from "./auth-accounts";
import type { User, UserRole, UserSession } from "./auth-types";
import type { ChecklistTask, Employee, ResponsibleTeam } from "./types";
import { isTaskBlockedByDependencies } from "./dependencies";
import { migrateEmailAddress } from "./email-domain";

export function loadSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserSession;
    const migratedEmail = migrateEmailAddress(session.email);
    if (migratedEmail !== session.email) {
      const next = { ...session, email: migratedEmail };
      saveSession(next);
      return next;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function loginWithPassword(
  email: string,
  password: string
): { ok: true; session: UserSession } | { ok: false; error: string } {
  const user = findDemoUser(email, password);
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }
  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
  saveSession(session);
  return { ok: true, session };
}

export function loginAsUser(user: User): UserSession {
  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function canViewAllCases(role: UserRole): boolean {
  return role === "Admin" || role === "HR";
}

export function canResetDemo(role: UserRole): boolean {
  return role === "Admin";
}

export function canViewAutomationRuns(role: UserRole): boolean {
  return role === "Admin";
}

export function canRunMockAutomation(role: UserRole): boolean {
  return role === "Admin";
}

export function teamForRole(role: UserRole): ResponsibleTeam | null {
  return ROLE_TO_TEAM[role] ?? null;
}

function normalizeEmail(email: string): string {
  return migrateEmailAddress(email.trim()).toLowerCase();
}

/** Match login email to assigned task mailbox (both @ppg-demo.com). */
export function emailMatchesAssignee(
  sessionEmail: string,
  assignedEmail: string
): boolean {
  const a = normalizeEmail(sessionEmail);
  const b = normalizeEmail(assignedEmail);
  if (!b) return false;
  return a === b;
}

export function canViewTask(
  session: UserSession,
  task: ChecklistTask,
  employee?: Employee
): boolean {
  if (session.role === "Admin") return true;
  if (
    session.role === "OFFBOARDING_EMPLOYEE" ||
    session.role === "ONBOARDING_EMPLOYEE"
  ) {
    return (
      normalizeEmail(task.assignedEmail) === normalizeEmail(session.email)
    );
  }
  const team = teamForRole(session.role);
  const teamOk = Boolean(team && task.responsibleTeam === team);
  const emailOk = emailMatchesAssignee(session.email, task.assignedEmail);
  if (!teamOk && !emailOk) return false;

  if (session.role === "HIRING_MANAGER") {
    if (!employee) return false;
    const mgr = normalizeEmail(employee.managerEmail);
    return mgr === normalizeEmail(session.email);
  }
  return true;
}

/**
 * A user may update a task only when Admin, or assignedEmail matches, or
 * responsibleTeam matches their team. Blocked / unmet-dependency tasks cannot
 * be updated (including by Admin).
 */
export function canUpdateTask(
  session: UserSession,
  task: ChecklistTask,
  employee?: Employee,
  allCaseTasks?: ChecklistTask[]
): boolean {
  if (task.status === "Blocked") return false;
  if (allCaseTasks && isTaskBlockedByDependencies(task, allCaseTasks)) {
    return false;
  }

  if (session.role === "Admin") return true;

  if (
    session.role === "OFFBOARDING_EMPLOYEE" ||
    session.role === "ONBOARDING_EMPLOYEE"
  ) {
    return (
      normalizeEmail(task.assignedEmail) === normalizeEmail(session.email) &&
      task.status !== "Completed" &&
      task.status !== "Cancelled"
    );
  }

  const team = teamForRole(session.role);
  const teamOk = Boolean(team && task.responsibleTeam === team);
  const emailOk = emailMatchesAssignee(session.email, task.assignedEmail);

  if (!teamOk && !emailOk) return false;

  if (session.role === "HIRING_MANAGER") {
    if (!employee) return false;
    const mgr = normalizeEmail(employee.managerEmail);
    return mgr === normalizeEmail(session.email);
  }

  return true;
}

export function filterTasksForUser(
  session: UserSession,
  tasks: ChecklistTask[],
  employees: Employee[]
): ChecklistTask[] {
  if (session.role === "Admin") return tasks;
  return tasks.filter((t) => {
    const emp = employees.find((e) => e.id === t.employeeId);
    return canViewTask(session, t, emp);
  });
}

export function navItemsForRole(
  role: UserRole
): Array<{ href: string; label: string }> {
  if (role === "Admin") {
    return [
      { href: "/oneflow", label: "Dashboard" },
      { href: "/oneflow/employees", label: "Employees" },
      { href: "/oneflow/lifecycle-cases", label: "Lifecycle Cases" },
      { href: "/oneflow/my-tasks", label: "My Tasks" },
      { href: "/oneflow/reports", label: "Reports" },
      { href: "/oneflow/settings", label: "Settings" },
    ];
  }
  if (role === "OFFBOARDING_EMPLOYEE") {
    return [
      { href: "/oneflow/my-offboarding", label: "My Offboarding" },
      { href: "/oneflow/my-tasks", label: "My Tasks" },
      { href: "/oneflow/inbox", label: "My Inbox" },
      { href: "/oneflow/my-forms", label: "My Forms" },
      { href: "/oneflow/my-profile", label: "My Profile" },
    ];
  }
  if (role === "ONBOARDING_EMPLOYEE") {
    return [
      { href: "/oneflow/my-onboarding", label: "My Onboarding" },
      { href: "/oneflow/my-tasks", label: "My Tasks" },
      { href: "/oneflow/inbox", label: "My Inbox" },
      { href: "/oneflow/my-forms", label: "My Forms" },
      { href: "/oneflow/my-profile", label: "My Profile" },
    ];
  }
  if (role === "HR") {
    return [
      { href: "/oneflow", label: "Dashboard" },
      { href: "/oneflow/my-tasks", label: "My Tasks" },
      { href: "/oneflow/lifecycle-cases", label: "Lifecycle Cases" },
      { href: "/oneflow/reports", label: "Reports" },
    ];
  }
  if (role === "HIRING_MANAGER") {
    return [
      { href: "/oneflow", label: "Dashboard" },
      { href: "/oneflow/my-tasks", label: "My Tasks" },
      { href: "/oneflow/my-new-hires", label: "Lifecycle Cases" },
      { href: "/oneflow/inbox", label: "My Inbox" },
    ];
  }
  return [
    { href: "/oneflow", label: "Dashboard" },
    { href: "/oneflow/my-tasks", label: "My Tasks" },
  ];
}

export { DEMO_USERS, TEAM_ASSIGNED_EMAIL, TEAM_INBOX_EMAIL };
