import { DEFAULT_ASSIGNMENT_RULES } from "../checklist";
import { createDefaultChecklistTemplates } from "../checklist-templates-seed";
import { createDefaultOffboardingTemplates } from "../offboarding-templates-seed";
import { createDefaultExitClearanceTemplates } from "../exit-clearance-templates-seed";
import { applyDependencyGraph } from "../dependencies";
import { createSeedStore } from "../seed";
import { DANIEL_EMPLOYEE_ID } from "../exit-clearance-types";
import { ALICIA_EMPLOYEE_ID, ALICIA_ONBOARDING_CASE_ID } from "../alicia-types";
import {
  migrateEmailsInUnknown,
  storeNeedsEmailMigration,
} from "../email-domain";
import type {
  ActivityHistory,
  AppStore,
  AssignmentRule,
  ChecklistTask,
  Employee,
  OnboardingCase,
  ResponsibleTeam,
} from "../types";
import type { OffboardingCase } from "../offboarding-types";
import type { AutomationRun, MockEmail } from "../auth-types";
import type {
  ChecklistTemplateAudit,
  ChecklistTemplateTask,
} from "../template-types";
import type {
  EmployeeExitClearanceForm,
  ExitClearanceTemplateItem,
} from "../exit-clearance-types";
import type {
  ActivityRepository,
  AssignmentRuleRepository,
  AutomationRunRepository,
  ChecklistTaskRepository,
  ChecklistTemplateAuditRepository,
  ChecklistTemplateRepository,
  EmployeeExitClearanceFormRepository,
  EmployeeRepository,
  ExitClearanceTemplateRepository,
  MockEmailRepository,
  OffboardingCaseRepository,
  OnboardingCaseRepository,
  UnitOfWork,
} from "./interfaces";

export const STORAGE_KEY = "oneflow-phase1-v3";

function migrateTemplateTask(
  raw: Partial<ChecklistTemplateTask> & { id: string; title: string }
): ChecklistTemplateTask {
  return {
    id: raw.id,
    processType: raw.processType ?? "Onboarding",
    checklistGroup: raw.checklistGroup ?? "HR",
    responsibleTeam: raw.responsibleTeam ?? "HR Operations",
    title: raw.title,
    description: raw.description ?? "",
    active: raw.active ?? true,
    required: raw.required ?? true,
    sortOrder: raw.sortOrder ?? 10,
    dueOffsetDays: raw.dueOffsetDays ?? -1,
    dependencyTemplateTaskIds: raw.dependencyTemplateTaskIds ?? [],
    assignedEmailRule: raw.assignedEmailRule ?? "Fixed Team Email",
    fixedAssignedEmail: raw.fixedAssignedEmail ?? "",
    reminderEnabled: raw.reminderEnabled ?? true,
    firstReminderAfterWorkingDays: raw.firstReminderAfterWorkingDays ?? 2,
    reminderFrequencyWorkingDays: raw.reminderFrequencyWorkingDays ?? 2,
    maximumReminderCount: raw.maximumReminderCount ?? 2,
    escalationAfterWorkingDays: raw.escalationAfterWorkingDays ?? 6,
    escalationEmailRule: raw.escalationEmailRule ?? "Admin",
    fixedEscalationEmail: raw.fixedEscalationEmail ?? "",
    securityCritical: raw.securityCritical,
    executionMode: raw.executionMode ?? null,
    requiresPurchaseOrder: raw.requiresPurchaseOrder ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    createdBy: raw.createdBy ?? "System",
    updatedBy: raw.updatedBy ?? "System",
  };
}
function migrateTask(raw: Partial<ChecklistTask> & { title: string }): ChecklistTask {
  const rule = DEFAULT_ASSIGNMENT_RULES.find((r) => r.taskName === raw.title);
  const assignedPersonName =
    raw.assignedPersonName ||
    raw.assignedOwner ||
    rule?.assignedPersonName ||
    "Unassigned";
  const assignedEmail =
    raw.assignedEmail ||
    rule?.assignedEmail ||
    "";
  return {
    id: raw.id || `tsk-migrated-${raw.title}`,
    employeeId: raw.employeeId || "",
    onboardingCaseId: raw.onboardingCaseId || "",
    processType: raw.processType ?? "Onboarding",
    offboardingCaseId: raw.offboardingCaseId ?? null,
    executionDateTime: raw.executionDateTime ?? null,
    executionMode: raw.executionMode ?? null,
    executionStatus: raw.executionStatus ?? null,
    securityCritical: raw.securityCritical ?? false,
    group: raw.group || rule?.checklistGroup || "HR Checklist",
    title: raw.title,
    description: raw.description ?? "",
    status: raw.status || "Pending",
    priority: raw.priority || "High",
    assignedOwner: assignedPersonName,
    responsibleTeam:
      raw.responsibleTeam || rule?.responsibleTeam || "HR Operations",
    assignedPersonName,
    assignedEmail,
    dueDate: raw.dueDate || new Date().toISOString().slice(0, 10),
    completedAt: raw.completedAt ?? null,
    notes: raw.notes || "",
    notificationStatus: raw.notificationStatus || "Not Sent",
    notificationSentAt: raw.notificationSentAt ?? null,
    reminderCount: raw.reminderCount ?? 0,
    lastReminderAt: raw.lastReminderAt ?? null,
    escalationStatus: raw.escalationStatus || "None",
    sourceSystem: raw.sourceSystem || "OneFlow",
    dependencyTaskIds: raw.dependencyTaskIds ?? [],
    blockedReason: raw.blockedReason ?? null,
    unlockedAt: raw.unlockedAt ?? null,
    required: raw.required ?? true,
    sortOrder: raw.sortOrder,
    templateTaskId: raw.templateTaskId ?? null,
    reminderEnabled: raw.reminderEnabled ?? true,
    firstReminderAfterWorkingDays: raw.firstReminderAfterWorkingDays ?? 2,
    reminderFrequencyWorkingDays: raw.reminderFrequencyWorkingDays ?? 2,
    maximumReminderCount: raw.maximumReminderCount ?? 2,
    escalationAfterWorkingDays: raw.escalationAfterWorkingDays ?? 6,
    escalationEmailRule: raw.escalationEmailRule ?? "Admin",
    fixedEscalationEmail: raw.fixedEscalationEmail ?? "",
    assignedAt: raw.assignedAt ?? null,
    firstReminderDueAt: raw.firstReminderDueAt ?? null,
    nextReminderDueAt: raw.nextReminderDueAt ?? null,
    lastReminderSentAt: raw.lastReminderSentAt ?? raw.lastReminderAt ?? null,
    escalationDueAt: raw.escalationDueAt ?? null,
    escalatedAt: raw.escalatedAt ?? null,
    reminderStatus: raw.reminderStatus ??
      (raw.reminderEnabled === false ? "Not Required" : "Scheduled"),
    // Exit Clearance + Unified Task Center (must survive reload)
    exitFormId: raw.exitFormId ?? null,
    exitFormItemId: raw.exitFormItemId ?? null,
    isExitClearanceEmployeeTask: raw.isExitClearanceEmployeeTask ?? false,
    isExitClearanceConfirmation: raw.isExitClearanceConfirmation ?? false,
    taskType:
      raw.taskType ??
      (raw.isExitClearanceConfirmation ? "Confirmation" : "Action"),
    outcome: raw.outcome ?? "None",
    instructions: raw.instructions ?? raw.description ?? "",
    lifecycleCaseId:
      raw.lifecycleCaseId ?? raw.offboardingCaseId ?? raw.onboardingCaseId ?? null,
    employeeName: raw.employeeName,
    employeeEmail: raw.employeeEmail,
    department: raw.department,
    responsibleRole: raw.responsibleRole,
    assignedUserId: raw.assignedUserId ?? null,
    assignedUserName: raw.assignedUserName ?? assignedPersonName,
    assignedTeam: raw.assignedTeam ?? raw.responsibleTeam,
    startedAt: raw.startedAt ?? null,
    completedBy: raw.completedBy ?? null,
    completedByName: raw.completedByName ?? null,
    remarks: raw.remarks ?? raw.notes ?? "",
    blocked: raw.blocked ?? raw.status === "Blocked",
    sourceType:
      raw.sourceType ??
      (raw.isExitClearanceConfirmation || raw.isExitClearanceEmployeeTask
        ? "Exit Clearance Form"
        : "Checklist"),
    sourceRecordId: raw.sourceRecordId ?? raw.exitFormItemId ?? null,
    linkedExitClearanceFormId:
      raw.linkedExitClearanceFormId ?? raw.exitFormId ?? null,
    linkedChecklistItemId:
      raw.linkedChecklistItemId ?? raw.exitFormItemId ?? null,
    linkedInductionFormId: raw.linkedInductionFormId ?? null,
    linkedAccessCardFormId: raw.linkedAccessCardFormId ?? null,
    relatedFormType: raw.relatedFormType ?? null,
    relatedFormId: raw.relatedFormId ?? null,
    relatedSectionId: raw.relatedSectionId ?? null,
    isInductionPresenterTask: raw.isInductionPresenterTask ?? false,
    isInductionEmployeeTask: raw.isInductionEmployeeTask ?? false,
    isInductionReviewTask: raw.isInductionReviewTask ?? false,
    isAccessCardEmployeeTask: raw.isAccessCardEmployeeTask ?? false,
    isAccessCardReviewTask: raw.isAccessCardReviewTask ?? false,
    isPersonalInfoReviewTask: raw.isPersonalInfoReviewTask ?? false,
    isFirstDayAckTask: raw.isFirstDayAckTask ?? false,
    isLaptopDecisionTask: raw.isLaptopDecisionTask ?? false,
    isLaptopProcurementTask: raw.isLaptopProcurementTask ?? false,
    isLaptopPrepareTask: raw.isLaptopPrepareTask ?? false,
    linkedLaptopRequestId: raw.linkedLaptopRequestId ?? null,
  };
}

function migrateTasksWithDependencies(
  tasks: ChecklistTask[]
): ChecklistTask[] {
  const byCase = new Map<string, ChecklistTask[]>();
  for (const t of tasks) {
    const caseKey =
      t.offboardingCaseId || t.onboardingCaseId || t.id;
    const list = byCase.get(caseKey) ?? [];
    list.push(t);
    byCase.set(caseKey, list);
  }
  const out: ChecklistTask[] = [];
  for (const caseTasks of byCase.values()) {
    out.push(...applyDependencyGraph(caseTasks));
  }
  return out;
}

function migrateOnboardingCase(
  raw: Partial<OnboardingCase> & { id: string }
): OnboardingCase {
  return {
    id: raw.id,
    caseNumber: raw.caseNumber ?? "",
    employeeId: raw.employeeId ?? "",
    status: raw.status ?? "Not Started",
    overallProgress: raw.overallProgress ?? 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    lastWorkflowTriggeredAt: raw.lastWorkflowTriggeredAt ?? null,
    lastWorkflowError: raw.lastWorkflowError ?? null,
    accountCreatedEmailSent: raw.accountCreatedEmailSent ?? false,
    accountCreatedEmailSentAt: raw.accountCreatedEmailSentAt ?? null,
    accountCreatedEmailId: raw.accountCreatedEmailId ?? null,
  };
}

function migrateAssignmentRules(rules: AssignmentRule[]): AssignmentRule[] {
  const byTask = new Map(rules.map((r) => [r.taskName, r]));
  let next = [...rules];
  for (const def of DEFAULT_ASSIGNMENT_RULES) {
    if (!byTask.has(def.taskName)) {
      next = [...next, def];
      byTask.set(def.taskName, def);
    }
  }
  return next;
}

function migrateStore(raw: Partial<AppStore>): AppStore {
  // Migration-history: rewrite legacy @oneflow.local addresses to @ppg-demo.com
  const migratedRaw = storeNeedsEmailMigration(raw)
    ? (migrateEmailsInUnknown(raw) as Partial<AppStore>)
    : raw;
  const seed = createSeedStore();
  const employees = migratedRaw.employees?.length
    ? migratedRaw.employees
    : seed.employees;
  const onboardingCases = (migratedRaw.onboardingCases ?? []).map((c) =>
    migrateOnboardingCase(c)
  );
  const offboardingCases = migratedRaw.offboardingCases ?? [];
  const assignmentRules = migrateAssignmentRules(
    migratedRaw.assignmentRules?.length
      ? [...migratedRaw.assignmentRules]
      : [...DEFAULT_ASSIGNMENT_RULES]
  );
  const migrated = (migratedRaw.tasks ?? []).map((t) => migrateTask(t));
  const migratedTemplates = migratedRaw.checklistTemplates?.length
    ? migratedRaw.checklistTemplates.map((t) => migrateTemplateTask(t))
    : createDefaultChecklistTemplates();
  const hasOffboardingTemplates = migratedTemplates.some(
    (t) => t.processType === "Offboarding"
  );
  let checklistTemplates = hasOffboardingTemplates
    ? migratedTemplates
    : [...migratedTemplates, ...createDefaultOffboardingTemplates()];
  // Inject new laptop procurement templates for future cases only (do not rewrite existing task snapshots).
  {
    const defaults = createDefaultChecklistTemplates();
    const missing = defaults.filter(
      (d) =>
        (d.id === "tmpl-laptop-decision" ||
          d.id === "tmpl-laptop-po" ||
          d.id === "tmpl-laptop-prepare") &&
        !checklistTemplates.some((t) => t.id === d.id)
    );
    if (missing.length) {
      checklistTemplates = [...checklistTemplates, ...missing];
    }
  }
  const exitClearanceTemplates =
    migratedRaw.exitClearanceTemplates?.length
      ? (migratedRaw.exitClearanceTemplates as ExitClearanceTemplateItem[])
      : createDefaultExitClearanceTemplates();
  let exitClearanceForms =
    (migratedRaw.exitClearanceForms as EmployeeExitClearanceForm[] | undefined) ??
    [];
  let nextEmployees = employees;
  let nextOnboarding = onboardingCases;
  let nextOffboarding = offboardingCases;
  let nextTasks = migrateTasksWithDependencies(migrated);
  let nextEmails = migratedRaw.mockEmails ?? [];
  let nextActivity = migratedRaw.activity ?? [];
  let nextRuns = migratedRaw.automationRuns ?? [];
  let inductionForms =
    (migratedRaw.inductionForms as AppStore["inductionForms"] | undefined) ?? [];
  let accessCardForms =
    (migratedRaw.accessCardForms as AppStore["accessCardForms"] | undefined) ??
    [];

  // Ensure permanent Daniel demo package exists after upgrades
  if (!nextEmployees.some((e) => e.id === DANIEL_EMPLOYEE_ID)) {
    const dEmp = seed.employees.find((e) => e.id === DANIEL_EMPLOYEE_ID)!;
    nextEmployees = [dEmp, ...nextEmployees];
    const dCase = seed.offboardingCases[0];
    if (dCase && !nextOffboarding.some((c) => c.id === dCase.id)) {
      nextOffboarding = [dCase, ...nextOffboarding];
    }
    const dTasks = seed.tasks.filter((t) => t.employeeId === DANIEL_EMPLOYEE_ID);
    nextTasks = [...dTasks, ...nextTasks];
    nextEmails = [
      ...seed.mockEmails.filter((e) => e.employeeId === DANIEL_EMPLOYEE_ID),
      ...nextEmails,
    ];
    nextActivity = [
      ...seed.activity.filter((a) => a.employeeId === DANIEL_EMPLOYEE_ID),
      ...nextActivity,
    ];
    nextRuns = [
      ...seed.automationRuns.filter((r) =>
        seed.tasks.some(
          (t) =>
            t.employeeId === DANIEL_EMPLOYEE_ID &&
            (r.onboardingCaseId === t.offboardingCaseId ||
              r.onboardingCaseId === t.onboardingCaseId)
        )
      ),
      ...nextRuns,
    ];
    exitClearanceForms = [...seed.exitClearanceForms, ...exitClearanceForms];
  }

  // Ensure permanent Alicia onboarding demo package exists after upgrades
  if (!nextEmployees.some((e) => e.id === ALICIA_EMPLOYEE_ID)) {
    const aEmp = seed.employees.find((e) => e.id === ALICIA_EMPLOYEE_ID)!;
    nextEmployees = [aEmp, ...nextEmployees];
    const aCase = seed.onboardingCases.find(
      (c) => c.id === ALICIA_ONBOARDING_CASE_ID
    );
    if (aCase && !nextOnboarding.some((c) => c.id === aCase.id)) {
      nextOnboarding = [aCase, ...nextOnboarding];
    }
    const aTasks = seed.tasks.filter((t) => t.employeeId === ALICIA_EMPLOYEE_ID);
    nextTasks = [...aTasks, ...nextTasks];
    nextEmails = [
      ...seed.mockEmails.filter((e) => e.employeeId === ALICIA_EMPLOYEE_ID),
      ...nextEmails,
    ];
    nextActivity = [
      ...seed.activity.filter((a) => a.employeeId === ALICIA_EMPLOYEE_ID),
      ...nextActivity,
    ];
    inductionForms = [
      ...seed.inductionForms.filter((f) => f.employeeId === ALICIA_EMPLOYEE_ID),
      ...inductionForms,
    ];
    accessCardForms = [
      ...seed.accessCardForms.filter((f) => f.employeeId === ALICIA_EMPLOYEE_ID),
      ...accessCardForms,
    ];
  } else if (
    !nextOnboarding.some((c) => c.id === ALICIA_ONBOARDING_CASE_ID)
  ) {
    const aCase = seed.onboardingCases.find(
      (c) => c.id === ALICIA_ONBOARDING_CASE_ID
    );
    if (aCase) nextOnboarding = [aCase, ...nextOnboarding];
    const aTasks = seed.tasks.filter((t) => t.employeeId === ALICIA_EMPLOYEE_ID);
    if (!nextTasks.some((t) => t.employeeId === ALICIA_EMPLOYEE_ID)) {
      nextTasks = [...aTasks, ...nextTasks];
    }
    if (!inductionForms.some((f) => f.employeeId === ALICIA_EMPLOYEE_ID)) {
      inductionForms = [
        ...seed.inductionForms.filter((f) => f.employeeId === ALICIA_EMPLOYEE_ID),
        ...inductionForms,
      ];
    }
    if (!accessCardForms.some((f) => f.employeeId === ALICIA_EMPLOYEE_ID)) {
      accessCardForms = [
        ...seed.accessCardForms.filter(
          (f) => f.employeeId === ALICIA_EMPLOYEE_ID
        ),
        ...accessCardForms,
      ];
    }
  }

  // Historical protection: do not inject new blueprint tasks into existing cases.
  const store: AppStore = {
    version: 6,
    employees: nextEmployees,
    onboardingCases: nextOnboarding,
    offboardingCases: nextOffboarding,
    tasks: nextTasks,
    activity: nextActivity,
    assignmentRules,
    checklistTemplates,
    checklistTemplateAudits: migratedRaw.checklistTemplateAudits ?? [],
    mockEmails: nextEmails,
    automationRuns: nextRuns,
    exitClearanceForms,
    exitClearanceTemplates,
    inductionForms,
    accessCardForms,
    laptopRequests:
      (migratedRaw.laptopRequests as AppStore["laptopRequests"] | undefined) ??
      seed.laptopRequests ??
      [],
    settings: {
      automationMode: migratedRaw.settings?.automationMode ?? "simulation",
    },
  };
  // Ensure Alicia laptop request exists when Alicia is present
  if (
    store.employees.some((e) => e.id === ALICIA_EMPLOYEE_ID) &&
    !store.laptopRequests.some((r) => r.employeeId === ALICIA_EMPLOYEE_ID)
  ) {
    store.laptopRequests = [
      ...seed.laptopRequests.filter((r) => r.employeeId === ALICIA_EMPLOYEE_ID),
      ...store.laptopRequests,
    ];
    const laptopTasks = seed.tasks.filter(
      (t) =>
        t.employeeId === ALICIA_EMPLOYEE_ID &&
        (t.isLaptopDecisionTask ||
          t.isLaptopProcurementTask ||
          t.isLaptopPrepareTask)
    );
    if (
      laptopTasks.length &&
      !store.tasks.some((t) => t.isLaptopDecisionTask && t.employeeId === ALICIA_EMPLOYEE_ID)
    ) {
      store.tasks = [...laptopTasks, ...store.tasks];
    }
  }
  return store;
}

export class LocalStorageRepository implements UnitOfWork {
  private store: AppStore;

  readonly employees: EmployeeRepository;
  readonly onboardingCases: OnboardingCaseRepository;
  readonly offboardingCases: OffboardingCaseRepository;
  readonly tasks: ChecklistTaskRepository;
  readonly activity: ActivityRepository;
  readonly assignmentRules: AssignmentRuleRepository;
  readonly mockEmails: MockEmailRepository;
  readonly automationRuns: AutomationRunRepository;
  readonly checklistTemplates: ChecklistTemplateRepository;
  readonly checklistTemplateAudits: ChecklistTemplateAuditRepository;
  readonly exitClearanceForms: EmployeeExitClearanceFormRepository;
  readonly exitClearanceTemplates: ExitClearanceTemplateRepository;
  readonly inductionForms: import("./interfaces").InductionFormRepository;
  readonly accessCardForms: import("./interfaces").AccessCardFormRepository;
  readonly laptopRequests: import("./interfaces").LaptopRequestRepository;

  constructor() {
    this.store = this.load();
    const self = this;

    this.employees = {
      list: () => [...self.store.employees],
      getById: (id) => self.store.employees.find((e) => e.id === id),
      create: (employee) => {
        self.store.employees = [employee, ...self.store.employees];
        return employee;
      },
      update: (employee) => {
        self.store.employees = self.store.employees.map((e) =>
          e.id === employee.id ? employee : e
        );
        return employee;
      },
      replaceAll: (employees) => {
        // Permanent demo employees cannot be dropped from the store.
        const seed = createSeedStore();
        let next = employees;
        for (const id of [DANIEL_EMPLOYEE_ID, ALICIA_EMPLOYEE_ID]) {
          if (!next.some((e) => e.id === id)) {
            const fromSeed = seed.employees.find((e) => e.id === id);
            if (fromSeed) next = [fromSeed, ...next];
          }
        }
        self.store.employees = next;
      },
    };

    this.onboardingCases = {
      list: () => [...self.store.onboardingCases],
      getById: (id) => self.store.onboardingCases.find((c) => c.id === id),
      getByEmployeeId: (employeeId) =>
        self.store.onboardingCases.find((c) => c.employeeId === employeeId),
      create: (onboardingCase) => {
        self.store.onboardingCases = [
          onboardingCase,
          ...self.store.onboardingCases,
        ];
        return onboardingCase;
      },
      update: (onboardingCase) => {
        self.store.onboardingCases = self.store.onboardingCases.map((c) =>
          c.id === onboardingCase.id ? onboardingCase : c
        );
        return onboardingCase;
      },
      replaceAll: (cases) => {
        self.store.onboardingCases = cases;
      },
    };

    this.offboardingCases = {
      list: () => [...self.store.offboardingCases],
      getById: (id) => self.store.offboardingCases.find((c) => c.id === id),
      getByEmployeeId: (employeeId) =>
        self.store.offboardingCases.find((c) => c.employeeId === employeeId),
      create: (offboardingCase) => {
        self.store.offboardingCases = [
          offboardingCase,
          ...self.store.offboardingCases,
        ];
        return offboardingCase;
      },
      update: (offboardingCase) => {
        self.store.offboardingCases = self.store.offboardingCases.map((c) =>
          c.id === offboardingCase.id ? offboardingCase : c
        );
        return offboardingCase;
      },
      replaceAll: (cases) => {
        self.store.offboardingCases = cases;
      },
    };

    this.tasks = {
      list: () => [...self.store.tasks],
      getById: (id) => self.store.tasks.find((t) => t.id === id),
      listByCaseId: (caseId) =>
        self.store.tasks.filter(
          (t) =>
            t.onboardingCaseId === caseId || t.offboardingCaseId === caseId
        ),
      listByAssigneeEmail: (email) => {
        const needle = email.trim().toLowerCase();
        if (!needle) return [];
        return self.store.tasks.filter(
          (t) => t.assignedEmail.toLowerCase() === needle
        );
      },
      listByResponsibleTeam: (team: ResponsibleTeam) =>
        self.store.tasks.filter((t) => t.responsibleTeam === team),
      createMany: (tasks) => {
        self.store.tasks = [...tasks, ...self.store.tasks];
        return tasks;
      },
      update: (task) => {
        self.store.tasks = self.store.tasks.map((t) =>
          t.id === task.id ? task : t
        );
        return task;
      },
      updateMany: (tasks) => {
        const map = new Map(tasks.map((t) => [t.id, t]));
        self.store.tasks = self.store.tasks.map((t) => map.get(t.id) ?? t);
      },
      replaceAll: (tasks) => {
        self.store.tasks = tasks;
      },
    };

    this.activity = {
      list: () => [...self.store.activity],
      listByCaseId: (caseId) =>
        self.store.activity
          .filter(
            (a) =>
              a.onboardingCaseId === caseId || a.offboardingCaseId === caseId
          )
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      create: (entry) => {
        self.store.activity = [entry, ...self.store.activity];
        return entry;
      },
      replaceAll: (entries) => {
        self.store.activity = entries;
      },
    };

    this.assignmentRules = {
      list: () => [...self.store.assignmentRules],
      getById: (id) => self.store.assignmentRules.find((r) => r.id === id),
      listActive: () => self.store.assignmentRules.filter((r) => r.active),
      replaceAll: (rules) => {
        self.store.assignmentRules = rules;
      },
    };

    this.mockEmails = {
      list: () => [...self.store.mockEmails],
      getById: (id) => self.store.mockEmails.find((e) => e.id === id),
      createMany: (emails) => {
        const stamped = emails.map((e) => ({
          ...e,
          deliveryMode: e.deliveryMode ?? null,
          provider: e.provider ?? "none",
          providerMessageId: e.providerMessageId ?? null,
          deliveryStatus: e.deliveryStatus ?? "Pending",
          deliveryAttemptCount: e.deliveryAttemptCount ?? 0,
          deliveredAt: e.deliveredAt ?? null,
          failedAt: e.failedAt ?? null,
          failureReason: e.failureReason ?? null,
          lastAttemptAt: e.lastAttemptAt ?? null,
          mappedRecipientMasked: e.mappedRecipientMasked ?? null,
        }));
        self.store.mockEmails = [...stamped, ...self.store.mockEmails];
      },
      update: (email) => {
        self.store.mockEmails = self.store.mockEmails.map((e) =>
          e.id === email.id ? email : e
        );
      },
      replaceAll: (emails) => {
        self.store.mockEmails = emails;
      },
    };

    this.automationRuns = {
      list: () =>
        [...self.store.automationRuns].sort((a, b) =>
          b.startedAt.localeCompare(a.startedAt)
        ),
      getById: (id) => self.store.automationRuns.find((r) => r.id === id),
      create: (run) => {
        self.store.automationRuns = [run, ...self.store.automationRuns];
      },
      update: (run) => {
        self.store.automationRuns = self.store.automationRuns.map((r) =>
          r.id === run.id ? run : r
        );
      },
      replaceAll: (runs) => {
        self.store.automationRuns = runs;
      },
    };

    this.checklistTemplates = {
      list: () => [...self.store.checklistTemplates],
      listActive: () =>
        self.store.checklistTemplates.filter((t) => t.active),
      getById: (id) =>
        self.store.checklistTemplates.find((t) => t.id === id),
      create: (task) => {
        self.store.checklistTemplates = [
          task,
          ...self.store.checklistTemplates,
        ];
        return task;
      },
      update: (task) => {
        self.store.checklistTemplates = self.store.checklistTemplates.map(
          (t) => (t.id === task.id ? task : t)
        );
        return task;
      },
      delete: (id) => {
        self.store.checklistTemplates = self.store.checklistTemplates.filter(
          (t) => t.id !== id
        );
        self.store.checklistTemplates = self.store.checklistTemplates.map(
          (t) => ({
            ...t,
            dependencyTemplateTaskIds: t.dependencyTemplateTaskIds.filter(
              (d) => d !== id
            ),
          })
        );
      },
      replaceAll: (tasks) => {
        self.store.checklistTemplates = tasks;
      },
    };

    this.checklistTemplateAudits = {
      list: () =>
        [...self.store.checklistTemplateAudits].sort((a, b) =>
          b.changedAt.localeCompare(a.changedAt)
        ),
      create: (entry) => {
        self.store.checklistTemplateAudits = [
          entry,
          ...self.store.checklistTemplateAudits,
        ];
        return entry;
      },
      replaceAll: (entries) => {
        self.store.checklistTemplateAudits = entries;
      },
    };

    this.exitClearanceForms = {
      list: () => [...self.store.exitClearanceForms],
      getById: (id) => self.store.exitClearanceForms.find((f) => f.id === id),
      getByCaseId: (caseId) =>
        self.store.exitClearanceForms.find((f) => f.offboardingCaseId === caseId),
      getByEmployeeId: (employeeId) =>
        self.store.exitClearanceForms.find((f) => f.employeeId === employeeId),
      create: (form) => {
        self.store.exitClearanceForms = [form, ...self.store.exitClearanceForms];
        return form;
      },
      update: (form) => {
        self.store.exitClearanceForms = self.store.exitClearanceForms.map((f) =>
          f.id === form.id ? form : f
        );
        return form;
      },
      replaceAll: (forms) => {
        self.store.exitClearanceForms = forms;
      },
    };

    this.exitClearanceTemplates = {
      list: () => [...self.store.exitClearanceTemplates],
      listActive: () =>
        self.store.exitClearanceTemplates.filter((t) => t.active),
      getById: (id) =>
        self.store.exitClearanceTemplates.find((t) => t.id === id),
      create: (item) => {
        self.store.exitClearanceTemplates = [
          item,
          ...self.store.exitClearanceTemplates,
        ];
        return item;
      },
      update: (item) => {
        self.store.exitClearanceTemplates = self.store.exitClearanceTemplates.map(
          (t) => (t.id === item.id ? item : t)
        );
        return item;
      },
      delete: (id) => {
        self.store.exitClearanceTemplates =
          self.store.exitClearanceTemplates.filter((t) => t.id !== id);
      },
      replaceAll: (items) => {
        self.store.exitClearanceTemplates = items;
      },
    };

    this.inductionForms = {
      list: () => [...self.store.inductionForms],
      getById: (id) => self.store.inductionForms.find((f) => f.id === id),
      getByEmployeeId: (employeeId) =>
        self.store.inductionForms.filter((f) => f.employeeId === employeeId),
      create: (form) => {
        self.store.inductionForms = [form, ...self.store.inductionForms];
        return form;
      },
      update: (form) => {
        self.store.inductionForms = self.store.inductionForms.map((f) =>
          f.id === form.id ? form : f
        );
        return form;
      },
      replaceAll: (forms) => {
        self.store.inductionForms = forms;
      },
    };

    this.accessCardForms = {
      list: () => [...self.store.accessCardForms],
      getById: (id) => self.store.accessCardForms.find((f) => f.id === id),
      getByEmployeeId: (employeeId) =>
        self.store.accessCardForms.filter((f) => f.employeeId === employeeId),
      create: (form) => {
        self.store.accessCardForms = [form, ...self.store.accessCardForms];
        return form;
      },
      update: (form) => {
        self.store.accessCardForms = self.store.accessCardForms.map((f) =>
          f.id === form.id ? form : f
        );
        return form;
      },
      replaceAll: (forms) => {
        self.store.accessCardForms = forms;
      },
    };

    this.laptopRequests = {
      list: () => [...self.store.laptopRequests],
      getById: (id) => self.store.laptopRequests.find((r) => r.id === id),
      getByCaseId: (caseId) =>
        self.store.laptopRequests.find((r) => r.onboardingCaseId === caseId),
      getByEmployeeId: (employeeId) =>
        self.store.laptopRequests.find((r) => r.employeeId === employeeId),
      create: (request) => {
        self.store.laptopRequests = [request, ...self.store.laptopRequests];
        return request;
      },
      update: (request) => {
        self.store.laptopRequests = self.store.laptopRequests.map((r) =>
          r.id === request.id ? request : r
        );
        return request;
      },
      replaceAll: (requests) => {
        self.store.laptopRequests = requests;
      },
    };
  }

  private load(): AppStore {
    if (typeof window === "undefined") {
      return createSeedStore();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = createSeedStore();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw) as Partial<AppStore>;
      const needsEmailFix = storeNeedsEmailMigration(parsed);
      const store = migrateStore(parsed);
      if (needsEmailFix) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      }
      return store;
    } catch {
      return createSeedStore();
    }
  }

  persist(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
  }

  getAutomationMode() {
    return this.store.settings.automationMode;
  }

  setAutomationMode(mode: "simulation" | "live") {
    this.store.settings.automationMode = mode;
    this.persist();
  }

  reset(seed: {
    employees: Employee[];
    onboardingCases: OnboardingCase[];
    offboardingCases?: OffboardingCase[];
    tasks: ChecklistTask[];
    activity: ActivityHistory[];
    assignmentRules: AssignmentRule[];
    mockEmails?: MockEmail[];
    automationRuns?: AutomationRun[];
    checklistTemplates?: ChecklistTemplateTask[];
    checklistTemplateAudits?: ChecklistTemplateAudit[];
    exitClearanceForms?: EmployeeExitClearanceForm[];
    exitClearanceTemplates?: ExitClearanceTemplateItem[];
    inductionForms?: import("../induction-types").InductionChecklistForm[];
    accessCardForms?: import("../access-card-types").SecurityAccessCardApplication[];
    laptopRequests?: import("../laptop-request-types").LaptopRequest[];
  }): void {
    this.store = {
      version: 6,
      employees: seed.employees,
      onboardingCases: seed.onboardingCases,
      offboardingCases: seed.offboardingCases ?? [],
      tasks: seed.tasks,
      activity: seed.activity,
      assignmentRules: seed.assignmentRules,
      checklistTemplates:
        seed.checklistTemplates ?? createDefaultChecklistTemplates(),
      checklistTemplateAudits: seed.checklistTemplateAudits ?? [],
      mockEmails: seed.mockEmails ?? [],
      automationRuns: seed.automationRuns ?? [],
      exitClearanceForms: seed.exitClearanceForms ?? [],
      exitClearanceTemplates:
        seed.exitClearanceTemplates ?? createDefaultExitClearanceTemplates(),
      inductionForms: seed.inductionForms ?? [],
      accessCardForms: seed.accessCardForms ?? [],
      laptopRequests: seed.laptopRequests ?? [],
      settings: { automationMode: "simulation" },
    };
    this.persist();
  }

  snapshot() {
    return {
      employees: this.store.employees,
      onboardingCases: this.store.onboardingCases,
      offboardingCases: this.store.offboardingCases,
      tasks: this.store.tasks,
      activity: this.store.activity,
      assignmentRules: this.store.assignmentRules,
      checklistTemplates: this.store.checklistTemplates,
      checklistTemplateAudits: this.store.checklistTemplateAudits,
      mockEmails: this.store.mockEmails,
      automationRuns: this.store.automationRuns,
      exitClearanceForms: this.store.exitClearanceForms,
      exitClearanceTemplates: this.store.exitClearanceTemplates,
      inductionForms: this.store.inductionForms,
      accessCardForms: this.store.accessCardForms,
      laptopRequests: this.store.laptopRequests,
      settings: { ...this.store.settings },
      version: this.store.version,
    };
  }

  reload(): void {
    this.store = this.load();
  }
}
