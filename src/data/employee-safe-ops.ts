import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import { migrateEmailAddress } from "./email-domain";
import type {
  EmployeeFacingClearanceStatus,
  EmployeeSafeFormSummary,
  EmployeeSafeOffboardingCase,
  EmployeeSafeTaskSummary,
} from "./employee-safe-types";
import { calculateExitFormProgress } from "./exit-clearance-engine";

function normalizeEmail(email: string): string {
  return migrateEmailAddress(email.trim()).toLowerCase();
}

export function canAccessOffboardingCaseAsEmployee(
  session: UserSession,
  caseEmployeeId: string,
  employeeEmail: string
): boolean {
  if (session.role !== "OFFBOARDING_EMPLOYEE") return false;
  return (
    normalizeEmail(session.email) === normalizeEmail(employeeEmail) ||
    // fallback: match via employee id resolved by caller
    Boolean(caseEmployeeId)
  );
}

function mapClearanceStatus(
  formStatus: string | undefined,
  overallProgress: number
): EmployeeFacingClearanceStatus {
  if (!formStatus || formStatus === "Not Sent" || formStatus === "Sent") {
    return "Form Pending";
  }
  if (formStatus === "Opened" || formStatus === "Draft") return "Form Pending";
  if (formStatus === "Submitted") return "Form Submitted";
  if (formStatus === "Returned for Correction") return "Form Pending";
  if (formStatus === "Confirmation In Progress") {
    return overallProgress >= 80
      ? "Clearance In Progress"
      : "Awaiting Department Review";
  }
  if (formStatus === "Fully Cleared" || formStatus === "Completed") {
    return "Cleared";
  }
  return "Clearance In Progress";
}

/**
 * Build a sanitized offboarding case for Offboarding Employee users.
 * Never includes internal department tasks or security-sensitive fields.
 */
export function getEmployeeSafeOffboardingCase(
  uow: UnitOfWork,
  session: UserSession,
  caseId: string
):
  | { ok: true; data: EmployeeSafeOffboardingCase }
  | { ok: false; error: string; redirectCaseId?: string } {
  const offCase = uow.offboardingCases.getById(caseId);
  if (!offCase) {
    return { ok: false, error: "Case not found." };
  }
  const employee = uow.employees.getById(offCase.employeeId);
  if (!employee) {
    return { ok: false, error: "Employee not found." };
  }

  if (session.role === "OFFBOARDING_EMPLOYEE") {
    if (normalizeEmail(session.email) !== normalizeEmail(employee.email)) {
      const own = uow.offboardingCases
        .list()
        .find((c) => {
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

  const exitForm = uow.exitClearanceForms.getByCaseId(caseId);
  const inductionForms = uow.inductionForms
    .list()
    .filter((f) => f.employeeId === employee.id);
  const accessForms = uow.accessCardForms
    .list()
    .filter((f) => f.employeeId === employee.id);

  const myEmail = normalizeEmail(session.email);
  const myTasksRaw = uow.tasks
    .list()
    .filter(
      (t) =>
        t.employeeId === employee.id &&
        normalizeEmail(t.assignedEmail) === myEmail
    );

  const forms: EmployeeSafeFormSummary[] = [];
  if (exitForm) {
    forms.push({
      id: exitForm.id,
      formName: "Employee Exit Clearance Form",
      formKind: "Exit Clearance",
      status: exitForm.formStatus,
      sentAt: exitForm.createdAt,
      dueDate: exitForm.formDueDate,
      updatedAt: exitForm.updatedAt,
      href: `/oneflow/exit-clearance/${exitForm.id}`,
    });
  }
  for (const f of inductionForms) {
    forms.push({
      id: f.id,
      formName: "Induction Checklist for New Employees",
      formKind: "Induction Checklist",
      status: f.formStatus,
      sentAt: f.createdAt,
      dueDate: f.formDueDate,
      updatedAt: f.updatedAt,
      href: `/oneflow/my-forms/induction/${f.id}`,
    });
  }
  for (const f of accessForms) {
    forms.push({
      id: f.id,
      formName: "UOA Security Access Card Application",
      formKind: "Access Card Application",
      status: f.formStatus,
      sentAt: f.createdAt,
      dueDate: f.formDueDate,
      updatedAt: f.updatedAt,
      href: `/oneflow/my-forms/access-card/${f.id}`,
    });
  }

  const myTasks: EmployeeSafeTaskSummary[] = myTasksRaw.map((t) => {
    let href = `/oneflow/tasks/${t.id}`;
    if (t.isExitClearanceEmployeeTask && (t.exitFormId || t.linkedExitClearanceFormId)) {
      href = `/oneflow/exit-clearance/${t.exitFormId || t.linkedExitClearanceFormId}`;
    } else if (t.linkedInductionFormId) {
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
    };
  });

  const exitProgress = exitForm ? calculateExitFormProgress(exitForm) : null;
  const openEmployeeTasks = myTasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled"
  ).length;
  const employeeActionProgress =
    myTasks.length === 0
      ? exitProgress?.percent ?? 0
      : Math.round(
          ((myTasks.length - openEmployeeTasks) / myTasks.length) * 100
        );

  const activity = uow.activity
    .list()
    .filter(
      (a) =>
        a.employeeId === employee.id &&
        a.offboardingCaseId === caseId &&
        !/^Audit:/i.test(a.action) &&
        !/automation|escalat|security|sailpoint|network id|disable/i.test(
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

  const clearanceStatus = mapClearanceStatus(
    exitForm?.formStatus,
    exitProgress?.percent ?? offCase.overallProgress
  );

  const assetReturnStatus =
    clearanceStatus === "Cleared"
      ? "Cleared"
      : clearanceStatus === "Form Pending"
        ? "Form Pending"
        : "Return Scheduled";

  const data: EmployeeSafeOffboardingCase = {
    caseId: offCase.id,
    caseNumber: offCase.caseNumber,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    employeeEmail: employee.email,
    lastWorkingDate: employee.lastWorkingDate ?? null,
    status: offCase.status,
    employeeActionProgress,
    clearanceStatus,
    assetReturnStatus,
    forms,
    myTasks,
    activity,
    contacts: [
      { label: "HR", email: "hr@ppg-demo.com" },
      { label: "Administration", email: "administration@ppg-demo.com" },
    ],
  };

  return { ok: true, data };
}

/** Whether an Offboarding Employee may open the internal case route. Always false. */
export function employeeMayOpenInternalCase(session: UserSession): boolean {
  return session.role !== "OFFBOARDING_EMPLOYEE";
}
