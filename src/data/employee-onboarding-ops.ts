import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import { migrateEmailAddress } from "./email-domain";
import {
  ALICIA_ONBOARDING_CASE_ID,
  FIRST_DAY_TASK_TITLE,
  PERSONAL_INFO_TASK_TITLE,
  resolveAliciaOnboardingCaseId,
  type CompanyPreparationStatus,
  type OnboardingEmployeeStage,
} from "./alicia-types";
import { getAliciaFirstDayContent } from "./alicia-seed";
import type { EmployeeLifecycleSummary } from "./employee-lifecycle-types";
import type {
  EmployeeSafeFormSummary,
  EmployeeSafeTaskSummary,
} from "./employee-safe-types";
import { getEmployeeSafeLaptopStatus } from "./laptop-request-workflow";
import { ensureAliciaOnboardingDemoData } from "./ensure-alicia-onboarding";
import { stopAllReminders } from "./automation/reminder-engine";

function normalizeEmail(email: string): string {
  return migrateEmailAddress(email.trim()).toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isEmployeeOwnedTask(t: {
  assignedEmail: string;
  isInductionEmployeeTask?: boolean;
  isAccessCardEmployeeTask?: boolean;
  isPersonalInfoReviewTask?: boolean;
  isFirstDayAckTask?: boolean;
  isExitClearanceEmployeeTask?: boolean;
}): boolean {
  return Boolean(
    t.isInductionEmployeeTask ||
      t.isAccessCardEmployeeTask ||
      t.isPersonalInfoReviewTask ||
      t.isFirstDayAckTask ||
      t.isExitClearanceEmployeeTask
  );
}

function mapCompanyPrep(
  deptTasks: { status: string }[],
  employeeDone: boolean
): CompanyPreparationStatus {
  if (!deptTasks.length) return employeeDone ? "Ready for Day One" : "Not Started";
  const completed = deptTasks.filter((t) => t.status === "Completed").length;
  const overdue = deptTasks.filter((t) => t.status === "Overdue").length;
  if (completed === deptTasks.length && employeeDone) return "Ready for Day One";
  if (overdue > 0) return "Attention Required";
  if (completed === 0) return "Not Started";
  if (completed / deptTasks.length >= 0.6) return "On Track";
  return "In Progress";
}

function mapStage(args: {
  personalDone: boolean;
  formsDone: boolean;
  firstDayDone: boolean;
  companyPrep: CompanyPreparationStatus;
}): OnboardingEmployeeStage {
  if (args.companyPrep === "Ready for Day One") return "Ready for Day One";
  if (args.firstDayDone && args.formsDone && args.personalDone) {
    return "Access and Equipment Preparation";
  }
  if (args.formsDone || args.personalDone) {
    if (!args.formsDone) return "Forms and Documents";
    return "Induction Preparation";
  }
  if (!args.personalDone) return "Personal Information";
  return "Welcome";
}

/**
 * Sanitized onboarding summary for Onboarding Employee users.
 */
export function getEmployeeOnboardingSummary(
  uow: UnitOfWork,
  session: UserSession,
  caseId: string
):
  | { ok: true; data: EmployeeLifecycleSummary }
  | { ok: false; error: string; redirectCaseId?: string } {
  const resolvedCaseId = resolveAliciaOnboardingCaseId(caseId);
  const onbCase =
    uow.onboardingCases.getById(resolvedCaseId) ||
    uow.onboardingCases.getById(caseId);
  if (!onbCase) return { ok: false, error: "Case not found." };
  const employee = uow.employees.getById(onbCase.employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  if (session.role === "ONBOARDING_EMPLOYEE") {
    if (normalizeEmail(session.email) !== normalizeEmail(employee.email)) {
      const own = uow.onboardingCases.list().find((c) => {
        const e = uow.employees.getById(c.employeeId);
        return e && normalizeEmail(e.email) === normalizeEmail(session.email);
      });
      return {
        ok: false,
        error: "Access denied.",
        redirectCaseId: own?.id,
      };
    }
  } else if (session.role !== "Admin" && session.role !== "HR") {
    return { ok: false, error: "Access denied." };
  }

  const myEmail = normalizeEmail(session.role === "ONBOARDING_EMPLOYEE" ? session.email : employee.email);
  const allTasks = uow.tasks
    .list()
    .filter((t) => t.onboardingCaseId === caseId);
  const employeeTasks = allTasks.filter(
    (t) =>
      normalizeEmail(t.assignedEmail) === myEmail ||
      (session.role !== "ONBOARDING_EMPLOYEE" && isEmployeeOwnedTask(t))
  );
  const visibleEmployeeTasks =
    session.role === "ONBOARDING_EMPLOYEE"
      ? allTasks.filter(
          (t) =>
            normalizeEmail(t.assignedEmail) === myEmail && isEmployeeOwnedTask(t)
        )
      : allTasks.filter(isEmployeeOwnedTask);

  const deptTasks = allTasks.filter((t) => !isEmployeeOwnedTask(t));

  const inductionForms = uow.inductionForms
    .list()
    .filter((f) => f.employeeId === employee.id);
  const accessForms = uow.accessCardForms
    .list()
    .filter((f) => f.employeeId === employee.id);

  const forms: EmployeeSafeFormSummary[] = [
    ...inductionForms.map((f) => ({
      id: f.id,
      formName: "Induction Checklist for New Employees",
      formKind: "Induction Checklist" as const,
      status: f.formStatus,
      sentAt: f.createdAt,
      dueDate: f.formDueDate,
      updatedAt: f.updatedAt,
      href: `/oneflow/my-forms/induction/${f.id}`,
      reviewer: f.reviewedBy,
      reviewStatus: f.formStatus,
    })),
    ...accessForms.map((f) => ({
      id: f.id,
      formName: "UOA Security Access Card Application",
      formKind: "Access Card Application" as const,
      status: f.formStatus,
      sentAt: f.createdAt,
      dueDate: f.formDueDate,
      updatedAt: f.updatedAt,
      href: `/oneflow/my-forms/access-card/${f.id}`,
      reviewer: f.reviewedBy,
      reviewStatus: f.formStatus,
    })),
  ];

  const myTasks: EmployeeSafeTaskSummary[] = visibleEmployeeTasks.map((t) => {
    let href = `/oneflow/tasks/${t.id}`;
    if (t.linkedInductionFormId) {
      href = `/oneflow/my-forms/induction/${t.linkedInductionFormId}`;
    } else if (t.linkedAccessCardFormId) {
      href = `/oneflow/my-forms/access-card/${t.linkedAccessCardFormId}`;
    }
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      taskType: t.taskType ?? "Action",
      href,
      relatedForm:
        t.linkedInductionFormId || t.linkedAccessCardFormId
          ? t.title
          : undefined,
    };
  });

  const personalDone = visibleEmployeeTasks.some(
    (t) => t.isPersonalInfoReviewTask && t.status === "Completed"
  );
  const firstDayDone = visibleEmployeeTasks.some(
    (t) => t.isFirstDayAckTask && t.status === "Completed"
  );
  const formsSubmitted =
    inductionForms.every((f) =>
      ["Submitted", "Under HR Review", "Completed"].includes(f.formStatus)
    ) &&
    accessForms.every((f) =>
      [
        "Submitted",
        "Under Administration Review",
        "Approved",
        "Card Issued",
        "Completed",
      ].includes(f.formStatus)
    ) &&
    inductionForms.length > 0 &&
    accessForms.length > 0;

  const employeeCompleted = visibleEmployeeTasks.filter(
    (t) => t.status === "Completed"
  ).length;
  const employeeTotal = visibleEmployeeTasks.length || 1;
  const employeeActionProgress = Math.round(
    (employeeCompleted / employeeTotal) * 100
  );

  const employeeActionsComplete =
    personalDone &&
    firstDayDone &&
    formsSubmitted &&
    visibleEmployeeTasks.every(
      (t) => t.status === "Completed" || t.status === "Cancelled"
    );

  const companyPreparationStatus = mapCompanyPrep(
    deptTasks,
    employeeActionsComplete
  );
  const currentStage = mapStage({
    personalDone,
    formsDone: formsSubmitted,
    firstDayDone,
    companyPrep: companyPreparationStatus,
  });

  const activity = uow.activity
    .list()
    .filter(
      (a) =>
        a.employeeId === employee.id &&
        a.onboardingCaseId === caseId &&
        !/^Audit:/i.test(a.action) &&
        !/sailpoint|network id|create email|security|escalat|dependency|admin override/i.test(
          `${a.action} ${a.detail}`
        )
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 30)
    .map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      action: a.action,
      detail: a.detail,
    }));

  const data: EmployeeLifecycleSummary = {
    caseId: onbCase.id,
    caseReference: onbCase.caseNumber,
    lifecycleType: "Onboarding",
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    employeeEmail: employee.email,
    jobTitle: employee.role,
    department: employee.department,
    location: employee.location,
    managerName: employee.managerName,
    employeeStatus: employee.employmentStatus,
    importantDate: employee.startDate,
    daysUntilImportantDate: daysUntil(employee.startDate),
    employeeActionProgress,
    employeeActionsCompleted: employeeCompleted,
    employeeActionsTotal: visibleEmployeeTasks.length,
    companyPreparationStatus,
    currentStage,
    forms,
    employeeTasks: myTasks,
    safeActivities: activity,
    contacts: [
      { label: "HR", email: "hr@ppg-demo.com" },
      { label: "Administration", email: "administration@ppg-demo.com" },
    ],
    firstDay: getAliciaFirstDayContent(employee),
    equipmentStatus: getEmployeeSafeLaptopStatus(uow, caseId).status,
    equipmentEstimatedReadiness:
      getEmployeeSafeLaptopStatus(uow, caseId).estimatedReadiness,
  };

  return { ok: true, data };
}

export function confirmPersonalInformation(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string,
  patch: {
    preferredName?: string;
    personalEmail?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
  }
) {
  const task = uow.tasks.getById(taskId);
  if (!task || !task.isPersonalInfoReviewTask) {
    return { ok: false as const, error: "Personal information task not found." };
  }
  if (
    session.role !== "Admin" &&
    normalizeEmail(session.email) !== normalizeEmail(task.assignedEmail)
  ) {
    return { ok: false as const, error: "Not authorized." };
  }
  const employee = uow.employees.getById(task.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const nextEmp = {
    ...employee,
    preferredName: patch.preferredName?.trim() || employee.preferredName,
    personalEmail: patch.personalEmail ?? employee.personalEmail,
    phone: patch.phone?.trim() || employee.phone,
    emergencyContactName:
      patch.emergencyContactName ?? employee.emergencyContactName,
    emergencyContactNumber:
      patch.emergencyContactNumber ?? employee.emergencyContactNumber,
    updatedAt: nowIso(),
  };
  uow.employees.update(nextEmp);
  uow.tasks.update({
    ...stopAllReminders(task),
    status: "Completed",
    outcome: "Reviewed",
    completedAt: nowIso(),
    completedBy: session.email,
    completedByName: session.name,
  });
  uow.activity.create({
    id: uid("act-pi"),
    employeeId: employee.id,
    onboardingCaseId: task.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Personal information confirmed",
    detail: `${session.name} confirmed personal information.`,
  });
  maybeMarkReadyForDayOne(uow, task.onboardingCaseId);
  uow.persist();
  return { ok: true as const, employee: nextEmp };
}

export function savePersonalInformationDraft(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string,
  patch: {
    preferredName?: string;
    personalEmail?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
  }
) {
  const task = uow.tasks.getById(taskId);
  if (!task || !task.isPersonalInfoReviewTask) {
    return { ok: false as const, error: "Task not found." };
  }
  if (
    session.role !== "Admin" &&
    normalizeEmail(session.email) !== normalizeEmail(task.assignedEmail)
  ) {
    return { ok: false as const, error: "Not authorized." };
  }
  const employee = uow.employees.getById(task.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };
  uow.employees.update({
    ...employee,
    preferredName: patch.preferredName ?? employee.preferredName,
    personalEmail: patch.personalEmail ?? employee.personalEmail,
    phone: patch.phone ?? employee.phone,
    emergencyContactName:
      patch.emergencyContactName ?? employee.emergencyContactName,
    emergencyContactNumber:
      patch.emergencyContactNumber ?? employee.emergencyContactNumber,
    updatedAt: nowIso(),
  });
  uow.activity.create({
    id: uid("act-pi-draft"),
    employeeId: employee.id,
    onboardingCaseId: task.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Personal information draft saved",
    detail: "Draft personal information updates saved.",
  });
  uow.persist();
  return { ok: true as const };
}

export function acknowledgeFirstDayInstructions(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string
) {
  const task = uow.tasks.getById(taskId);
  if (!task || !task.isFirstDayAckTask) {
    return { ok: false as const, error: "First-day task not found." };
  }
  if (
    session.role !== "Admin" &&
    normalizeEmail(session.email) !== normalizeEmail(task.assignedEmail)
  ) {
    return { ok: false as const, error: "Not authorized." };
  }
  uow.tasks.update({
    ...stopAllReminders(task),
    status: "Completed",
    outcome: "Acknowledged",
    completedAt: nowIso(),
    completedBy: session.email,
    completedByName: session.name,
  });
  uow.activity.create({
    id: uid("act-fd"),
    employeeId: task.employeeId,
    onboardingCaseId: task.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "First-day instructions acknowledged",
    detail: `${session.name} acknowledged first-day instructions.`,
  });
  maybeMarkReadyForDayOne(uow, task.onboardingCaseId);
  uow.persist();
  return { ok: true as const };
}

/** When employee actions + dept tasks complete, set Ready for Day One + email. */
export function maybeMarkReadyForDayOne(
  uow: UnitOfWork,
  onboardingCaseId: string
) {
  const onb = uow.onboardingCases.getById(onboardingCaseId);
  if (!onb) return;
  const employee = uow.employees.getById(onb.employeeId);
  if (!employee) return;
  const tasks = uow.tasks
    .list()
    .filter((t) => t.onboardingCaseId === onboardingCaseId);
  const employeeTasks = tasks.filter(isEmployeeOwnedTask);
  const deptTasks = tasks.filter((t) => !isEmployeeOwnedTask(t));
  if (
    !employeeTasks.length ||
    !employeeTasks.every((t) => t.status === "Completed")
  ) {
    return;
  }
  if (!deptTasks.every((t) => t.status === "Completed")) return;

  const already = uow.mockEmails
    .list()
    .some(
      (e) =>
        e.employeeId === employee.id &&
        e.subject.includes("Ready for Your First Day")
    );
  if (already) return;

  const firstDay = getAliciaFirstDayContent(employee);
  uow.mockEmails.createMany([
    {
      id: uid("mail-ready"),
      automationRunId: "",
      from: "hr@ppg-demo.com",
      to: employee.email,
      cc: [],
      subject: "You Are Ready for Your First Day at PPG",
      htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;">
        <p>Hello ${employee.fullName},</p>
        <p>You are ready for your first day at PPG.</p>
        <p>
          Start date: ${firstDay.reportingDate}<br/>
          Reporting time: ${firstDay.reportingTime}<br/>
          Location: ${firstDay.officeLocation}<br/>
          Manager: ${firstDay.managerName}<br/>
          Contact: ${firstDay.contactPerson} · ${firstDay.contactEmail}
        </p>
        <p><strong>What to bring:</strong></p>
        <ul>${firstDay.itemsToBring.map((i) => `<li>${i}</li>`).join("")}</ul>
        <p><a href="/oneflow/my-onboarding/${onboardingCaseId}">View My Onboarding</a></p>
      </div>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId,
      responsibleTeam: "HR Operations",
    },
  ]);
  uow.onboardingCases.update({
    ...onb,
    status: "In Progress",
    overallProgress: 100,
    updatedAt: nowIso(),
  });
  uow.activity.create({
    id: uid("act-ready"),
    employeeId: employee.id,
    onboardingCaseId,
    timestamp: nowIso(),
    actor: "OneFlow Automation",
    action: "Ready for Day One",
    detail: "Employee-facing status set to Ready for Day One · final email sent",
  });
}

export function resetAliciaOnboardingJourney(
  uow: UnitOfWork,
  session: UserSession,
  packageBuilder: () => ReturnType<
    typeof import("./alicia-seed").buildAliciaDemoPackage
  >
) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const pkg = packageBuilder();
  const otherEmployees = uow.employees
    .list()
    .filter((e) => e.id !== pkg.employee.id);
  uow.employees.replaceAll([pkg.employee, ...otherEmployees]);

  // Remove any legacy Alicia case IDs as well as the canonical one
  const otherCases = uow.onboardingCases
    .list()
    .filter(
      (c) =>
        c.id !== ALICIA_ONBOARDING_CASE_ID &&
        c.employeeId !== pkg.employee.id
    );
  uow.onboardingCases.replaceAll([pkg.onboardingCase, ...otherCases]);

  const otherTasks = uow.tasks
    .list()
    .filter((t) => t.employeeId !== pkg.employee.id);
  uow.tasks.replaceAll([...pkg.tasks, ...otherTasks]);

  const otherInd = uow.inductionForms
    .list()
    .filter((f) => f.employeeId !== pkg.employee.id);
  uow.inductionForms.replaceAll([pkg.inductionForm, ...otherInd]);

  const otherAcc = uow.accessCardForms
    .list()
    .filter((f) => f.employeeId !== pkg.employee.id);
  uow.accessCardForms.replaceAll([pkg.accessCardForm, ...otherAcc]);

  const otherLaptop = uow.laptopRequests
    .list()
    .filter((r) => r.employeeId !== pkg.employee.id);
  uow.laptopRequests.replaceAll([
    ...(pkg.laptopRequests || []),
    ...otherLaptop,
  ]);

  const otherEmails = uow.mockEmails
    .list()
    .filter((e) => e.employeeId !== pkg.employee.id);
  uow.mockEmails.replaceAll([...pkg.emails, ...otherEmails]);

  const otherAct = uow.activity
    .list()
    .filter((a) => a.employeeId !== pkg.employee.id);
  uow.activity.replaceAll([...pkg.activity, ...otherAct]);

  // Final idempotent link repair (no duplicates)
  ensureAliciaOnboardingDemoData(uow, session);

  uow.activity.create({
    id: uid("act-alicia-reset"),
    employeeId: pkg.employee.id,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    timestamp: nowIso(),
    actor: session.name,
    action: "Alicia onboarding journey reset",
    detail:
      "Presentation demo: Alicia onboarding restored with stable form/task/laptop IDs",
  });
  uow.persist();
  return { ok: true as const, caseId: ALICIA_ONBOARDING_CASE_ID };
}

export { PERSONAL_INFO_TASK_TITLE, FIRST_DAY_TASK_TITLE };
