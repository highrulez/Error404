import { addDays } from "./checklist";
import { createDefaultExitClearanceTemplates } from "./exit-clearance-templates-seed";
import {
  buildExitEmployeeTask,
  buildInitialExitFormEmail,
  exitActivity,
  recordExitAutomationRun,
  snapshotExitFormFromTemplates,
} from "./exit-clearance-engine";
import {
  DANIEL_EMAIL,
  DANIEL_EMPLOYEE_ID,
  DANIEL_EMPLOYEE_NUMBER,
  DANIEL_EXIT_FORM_ID,
  DANIEL_OFFBOARDING_CASE_ID,
  type EmployeeExitClearanceForm,
  type ExitClearanceTemplateItem,
} from "./exit-clearance-types";
import type { OffboardingCase } from "./offboarding-types";
import type {
  ActivityHistory,
  AppStore,
  ChecklistTask,
  Employee,
} from "./types";
import type { AutomationRun, MockEmail } from "./auth-types";
import { generateOffboardingChecklistTasks } from "./offboarding-engine";
import type { UnitOfWork } from "./repositories/interfaces";

function nowIso(): string {
  return new Date().toISOString();
}

export function createDanielEmployee(now = nowIso()): Employee {
  const lastWorkingDate = addDays(now.slice(0, 10), 14);
  return {
    id: DANIEL_EMPLOYEE_ID,
    employeeNumber: DANIEL_EMPLOYEE_NUMBER,
    fullName: "Daniel Lim",
    preferredName: "Daniel",
    email: DANIEL_EMAIL,
    phone: "+60 12-345 6789",
    department: "Sales",
    role: "Sales Executive",
    location: "Malaysia – Shah Alam",
    managerName: "Sarah Tan",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Offboarding",
    startDate: "2021-03-15",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
    lastWorkingDate,
    terminationType: "Resignation",
    terminationReason: "Permanent demo offboarding journey",
    immediateAccessRemovalRequired: false,
    offboardingStatus: "Scheduled",
  };
}

export function createDanielOffboardingCase(
  employee: Employee,
  now = nowIso()
): OffboardingCase {
  return {
    id: DANIEL_OFFBOARDING_CASE_ID,
    caseNumber: "OFF-2026-0881",
    employeeId: employee.id,
    status: "Scheduled",
    overallProgress: 0,
    riskLevel: "Normal",
    lastWorkingDate: employee.lastWorkingDate || addDays(now.slice(0, 10), 14),
    terminationType: employee.terminationType || "Resignation",
    terminationReason: employee.terminationReason || "",
    immediateAccessRemovalRequired: false,
    createdAt: now,
    updatedAt: now,
    lastWorkflowTriggeredAt: now,
    lastWorkflowError: null,
    completedAt: null,
  };
}

/**
 * Build Daniel's permanent demo package into a mutable UnitOfWork-like store
 * using a lightweight in-memory adapter for template-driven task generation.
 */
export function buildDanielDemoPackage(args: {
  checklistTemplates: AppStore["checklistTemplates"];
  assignmentRules: AppStore["assignmentRules"];
  exitClearanceTemplates?: ExitClearanceTemplateItem[];
}): {
  employee: Employee;
  offboardingCase: OffboardingCase;
  exitForm: EmployeeExitClearanceForm;
  tasks: ChecklistTask[];
  emails: MockEmail[];
  activity: ActivityHistory[];
  automationRuns: AutomationRun[];
  exitClearanceTemplates: ExitClearanceTemplateItem[];
} {
  const now = nowIso();
  const employee = createDanielEmployee(now);
  const offboardingCase = createDanielOffboardingCase(employee, now);
  const exitClearanceTemplates =
    args.exitClearanceTemplates ?? createDefaultExitClearanceTemplates();

  // Minimal UoW shim for generateOffboardingChecklistTasks
  const tempTasks: ChecklistTask[] = [];
  const tempEmails: MockEmail[] = [];
  const tempRuns: AutomationRun[] = [];
  const tempActivity: ActivityHistory[] = [];
  const tempForms: EmployeeExitClearanceForm[] = [];

  const uow = {
    checklistTemplates: {
      listActive: () => args.checklistTemplates.filter((t) => t.active),
      list: () => args.checklistTemplates,
      getById: (id: string) => args.checklistTemplates.find((t) => t.id === id),
      create: (t: (typeof args.checklistTemplates)[0]) => t,
      update: (t: (typeof args.checklistTemplates)[0]) => t,
      delete: () => undefined,
      replaceAll: () => undefined,
    },
    assignmentRules: {
      list: () => args.assignmentRules,
      listActive: () => args.assignmentRules.filter((r) => r.active),
      getById: (id: string) => args.assignmentRules.find((r) => r.id === id),
      replaceAll: () => undefined,
    },
    tasks: {
      list: () => tempTasks,
      getById: (id: string) => tempTasks.find((t) => t.id === id),
      listByCaseId: () => [],
      listByAssigneeEmail: () => [],
      listByResponsibleTeam: () => [],
      createMany: (tasks: ChecklistTask[]) => {
        tempTasks.push(...tasks);
        return tasks;
      },
      update: (t: ChecklistTask) => t,
      updateMany: () => undefined,
      replaceAll: () => undefined,
    },
    mockEmails: {
      list: () => tempEmails,
      getById: () => undefined,
      createMany: (emails: MockEmail[]) => {
        tempEmails.push(...emails);
      },
      update: () => undefined,
      replaceAll: () => undefined,
    },
    automationRuns: {
      list: () => tempRuns,
      getById: (id: string) => tempRuns.find((r) => r.id === id),
      create: (run: AutomationRun) => {
        tempRuns.push(run);
      },
      update: () => undefined,
      replaceAll: () => undefined,
    },
    activity: {
      list: () => tempActivity,
      listByCaseId: () => [],
      create: (a: ActivityHistory) => {
        tempActivity.push(a);
        return a;
      },
      replaceAll: () => undefined,
    },
    employees: {
      list: () => [employee],
      getById: () => employee,
      create: () => employee,
      update: () => employee,
      replaceAll: () => undefined,
    },
    offboardingCases: {
      list: () => [offboardingCase],
      getById: () => offboardingCase,
      getByEmployeeId: () => offboardingCase,
      create: () => offboardingCase,
      update: () => offboardingCase,
      replaceAll: () => undefined,
    },
    exitClearanceForms: {
      list: () => tempForms,
      getById: (id: string) => tempForms.find((f) => f.id === id),
      getByCaseId: () => tempForms[0],
      getByEmployeeId: () => tempForms[0],
      create: (f: EmployeeExitClearanceForm) => {
        tempForms.push(f);
        return f;
      },
      update: (f: EmployeeExitClearanceForm) => f,
      replaceAll: () => undefined,
    },
    exitClearanceTemplates: {
      list: () => exitClearanceTemplates,
      listActive: () => exitClearanceTemplates.filter((t) => t.active),
      getById: (id: string) => exitClearanceTemplates.find((t) => t.id === id),
      create: (t: ExitClearanceTemplateItem) => t,
      update: (t: ExitClearanceTemplateItem) => t,
      delete: () => undefined,
      replaceAll: () => undefined,
    },
  } as unknown as UnitOfWork;

  const offboardingTasks = generateOffboardingChecklistTasks(
    employee,
    DANIEL_OFFBOARDING_CASE_ID,
    uow,
    {
      immediate: false,
      lastWorkingDate: employee.lastWorkingDate!,
    }
  );

  const exitForm = snapshotExitFormFromTemplates(
    employee,
    DANIEL_OFFBOARDING_CASE_ID,
    exitClearanceTemplates,
    { formId: DANIEL_EXIT_FORM_ID }
  );
  exitForm.formStatus = "Sent";

  const employeeTask = buildExitEmployeeTask({
    employee,
    caseId: DANIEL_OFFBOARDING_CASE_ID,
    formId: DANIEL_EXIT_FORM_ID,
    dueDate: exitForm.formDueDate,
  });

  const runId = recordExitAutomationRun({
    uow,
    employee,
    caseId: DANIEL_OFFBOARDING_CASE_ID,
    trigger: "Exit clearance form sent",
    taskCount: 1,
    emailCount: 1,
  });
  const email = buildInitialExitFormEmail({ form: exitForm, runId });
  exitForm.initialEmailId = email.id;

  const activity = [
    exitActivity(
      employee.id,
      DANIEL_OFFBOARDING_CASE_ID,
      "PPG Workday",
      "Offboarding case created",
      `${offboardingCase.caseNumber} · permanent demo employee Daniel Lim`
    ),
    exitActivity(
      employee.id,
      DANIEL_OFFBOARDING_CASE_ID,
      "OneFlow Automation",
      "Exit clearance form sent",
      "Initial Employee Exit Clearance Form email generated for Daniel Lim"
    ),
  ];

  return {
    employee,
    offboardingCase,
    exitForm,
    tasks: [...offboardingTasks, employeeTask],
    emails: [email],
    activity,
    automationRuns: tempRuns,
    exitClearanceTemplates,
  };
}
