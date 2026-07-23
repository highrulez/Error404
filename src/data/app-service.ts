import {
  addDays,
  matchAssignmentRule,
} from "./checklist";
import {
  calculateCaseProgress,
  LocalAutomationService,
} from "./automation/service";
import { LocalMockAutomationEngine } from "./automation/mock-engine";
import { LocalStorageRepository } from "./repositories/local-storage-repository";
import type { UnitOfWork } from "./repositories/interfaces";
import { createSeedStore } from "./seed";
import {
  buildOffboardingDepartmentEmails,
  buildOffboardingEventEmail,
  generateOffboardingChecklistTasks,
  recordOffboardingAutomationRun,
  refreshOffboardingCaseProgress,
  calculateOffboardingRisk,
} from "./offboarding-engine";
import {
  attachExitClearanceToCase,
  calculateExitFormProgress,
  canAccessExitForm,
  confirmAllExitItems,
  confirmExitItem,
  openExitForm,
  populateSampleExitForm,
  resetDanielExitJourney,
  saveExitDraft,
  submitExitForm,
  type ExitFormEmployeePatch,
} from "./exit-clearance-ops";
import type {
  ExitClearanceTemplateItem,
  ExitClearanceTemplateItemInput,
} from "./exit-clearance-types";
import {
  buildInitialExitFormEmail,
  exitActivity,
  recordExitAutomationRun,
} from "./exit-clearance-engine";
import { emailMatchesAssignee } from "./auth-session";
import type {
  OffboardingCase,
  TerminationType,
} from "./offboarding-types";
import {
  canUpdateTask,
  filterTasksForUser,
} from "./auth-session";
import {
  applyDependencyGraph,
  blockedReasonFor,
  buildUnlockEmail,
  isTaskBlockedByDependencies,
  unmetPrerequisiteTitles,
} from "./dependencies";
import {
  areItSecurityAccountTasksComplete,
  buildAccountCreatedEmail,
  shouldSkipGenericOnsiteUnlockEmail,
} from "./automation/account-created-workflow";
import { TEMPLATE_GROUP_TO_CASE_GROUP } from "./template-types";
import type {
  ChecklistTemplateAudit,
  ChecklistTemplateTask,
  ChecklistTemplateTaskInput,
} from "./template-types";
import {
  sortTemplates,
  validateTemplateTaskInput,
} from "./template-validation";
import {
  initReminderFieldsFromTemplate,
  LocalReminderEngine,
  pauseRemindersWhileBlocked,
  restartRemindersFromUnlock,
  stopAllReminders,
  stopNotStartedReminders,
} from "./automation/reminder-engine";
import type { UserSession } from "./auth-types";
import type { AutomationRun } from "./auth-types";
import type {
  ChecklistTask,
  CreateEmployeeInput,
  DataService,
  Employee,
  ResponsibleTeam,
  TaskStatus,
} from "./types";
import {
  TaskWorkflowService,
  isConfirmationTask,
  type ExecuteTaskInput,
} from "./task-workflow-service";
import { repairExitConfirmationData } from "./repair-exit-confirmation";
import { repairAdministrationRecipientRecords } from "./repair-admin-email";
import { ADMIN_MOCK_EMAIL } from "./email-domain";
import { normalizeUnifiedTask } from "./task-normalize";
import { getEmployeeSafeOffboardingCase } from "./employee-safe-ops";
import {
  acknowledgeFirstDayInstructions,
  confirmPersonalInformation,
  getEmployeeOnboardingSummary,
  maybeMarkReadyForDayOne,
  resetAliciaOnboardingJourney,
  savePersonalInformationDraft,
} from "./employee-onboarding-ops";
import { buildAliciaDemoPackage, buildAliciaWelcomeEmail } from "./alicia-seed";
import {
  ensureAliciaOnboardingDemoData,
  repairAliciaOnboardingJourney,
} from "./ensure-alicia-onboarding";
import { repairAliciaOnboardingForms } from "./alicia-form-repair";
import {
  ALICIA_ACCESS_CARD_FORM_ID,
  ALICIA_EMPLOYEE_ID,
  ALICIA_INDUCTION_FORM_ID,
  ALICIA_ONBOARDING_CASE_ID,
  resolveAliciaAccessCardFormId,
  resolveAliciaInductionFormId,
} from "./alicia-types";
import {
  assignInductionToEmployee,
  openInductionForm,
  populateInductionDemo,
  reviewInductionForm,
  resetInductionFormsForEmployee,
  saveInductionDraft,
  submitInductionForm,
} from "./induction-ops";
import {
  completeInductionSession,
  populateAllInductionSessionsDemo,
  repairAliciaInductionWorkflow,
  resetAliciaInductionJourney,
  returnInductionSessionForReschedule,
  startInductionSession,
} from "./induction-presenter-workflow";
import {
  assignAccessCardToEmployee,
  openAccessCardForm,
  populateAccessCardDemo,
  reviewAccessCardForm,
  resetAccessCardFormsForEmployee,
  saveAccessCardDraft,
  submitAccessCardForm,
  type AccessCardEmployeePatch,
} from "./access-card-ops";
import {
  advanceDemoLaptopTime,
  cancelLaptopRequest,
  confirmPurchaseOrder,
  getEmployeeSafeLaptopStatus,
  getLaptopRequest,
  getLaptopRequestByCase,
  initializeLaptopRequestForOnboardingCase,
  populateDemoPO,
  resetDemoLaptopRequest,
  returnLaptopRequestToManager,
  saveProcurementDraft,
  simulateManagerDelay,
  simulateMissingCreditNumber,
  submitDemoLaptopRequest,
  submitLaptopNotRequired,
  submitLaptopRequired,
  updateEquipmentPreparationStatus,
} from "./laptop-request-workflow";
import {
  deliverMockEmailWithProvider,
  installNotificationDelivery,
  setNotificationActor,
} from "./email-delivery";
import type { WorkflowEmailAction } from "./auth-types";
import { LAPTOP_DEMO } from "./laptop-request-types";
import {
  DANIEL_EMPLOYEE_ID,
  DANIEL_OFFBOARDING_CASE_ID,
} from "./exit-clearance-types";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Snapshot active checklist templates onto a new onboarding case.
 * Template changes never rewrite existing cases.
 */
function generateChecklistTasks(
  employee: Employee,
  caseId: string,
  uow: UnitOfWork
): ChecklistTask[] {
  const templates = sortTemplates(
    uow.checklistTemplates
      .listActive()
      .filter((t) => (t.processType ?? "Onboarding") === "Onboarding")
  );
  const rules = uow.assignmentRules.listActive();
  const templateToTaskId = new Map<string, string>();
  const assignedAt = nowIso();

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

    return {
      id: taskId,
      employeeId: employee.id,
      onboardingCaseId: caseId,
      processType: "Onboarding" as const,
      offboardingCaseId: null,
      group: TEMPLATE_GROUP_TO_CASE_GROUP[tmpl.checklistGroup],
      title: tmpl.title,
      description: tmpl.description,
      status: "Pending" as TaskStatus,
      priority: "High" as const,
      assignedOwner: assignedPersonName,
      responsibleTeam: tmpl.responsibleTeam,
      assignedPersonName,
      assignedEmail,
      dueDate: addDays(employee.startDate, tmpl.dueOffsetDays),
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
      taskType: "Action" as const,
      outcome: "None" as const,
      instructions: tmpl.description,
      lifecycleCaseId: caseId,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
      department: employee.department,
      sourceType: "Checklist" as const,
    };
  });

  const withDeps = draft.map((task, index) => {
    const tmpl = templates[index];
    const dependencyTaskIds = (tmpl?.dependencyTemplateTaskIds ?? [])
      .map((id) => templateToTaskId.get(id))
      .filter(Boolean) as string[];
    return { ...task, dependencyTaskIds };
  });

  const graphed = applyDependencyGraph(withDeps);
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

/**
 * Application service — UI depends only on DataService.
 * Persistence goes through UnitOfWork (LocalStorageRepository today).
 */
export class AppDataService implements DataService {
  private readonly uow: LocalStorageRepository;
  private readonly automation: LocalAutomationService;
  private readonly mockEngine: LocalMockAutomationEngine;
  private readonly reminderEngine: LocalReminderEngine;
  private repairRan = false;

  constructor(uow?: LocalStorageRepository) {
    this.uow = uow ?? new LocalStorageRepository();
    // Route every mockEmails.createMany through NotificationService → SES API
    installNotificationDelivery(this.uow);
    this.automation = new LocalAutomationService(this.uow);
    this.mockEngine = new LocalMockAutomationEngine(this.uow, (caseId) => {
      const summary = this.automation.recalculateProgress(caseId);
      return summary.overallProgress;
    });
    this.reminderEngine = new LocalReminderEngine(this.uow);
  }

  /** Bind the logged-in user as the notification delivery actor. */
  setNotificationSession(session: import("./auth-types").UserSession | null) {
    setNotificationActor(session);
  }

  private workflow() {
    return new TaskWorkflowService(this.uow);
  }

  private ensureRepaired() {
    if (this.repairRan) return;
    this.repairRan = true;
    try {
      repairExitConfirmationData(this.uow, {
        actor: "OneFlow Data Repair",
        persist: true,
      });
    } catch {
      // Non-fatal — leave store as-is
    }
    try {
      repairAdministrationRecipientRecords(this.uow);
      this.uow.persist();
    } catch {
      // Non-fatal
    }
  }

  /**
   * Rewrite administration@ → admin@ on stored notifications/tasks (no SES resend).
   * Optionally refreshes mappedRecipientMasked from /api/email/settings.
   */
  async repairAdministrationEmails(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const result = repairAdministrationRecipientRecords(this.uow);

    // Populate masked destinations without sending mail
    try {
      const res = await fetch("/api/email/settings");
      const data = (await res.json()) as {
        ok?: boolean;
        settings?: {
          mappings?: Array<{
            simulated: string;
            mappedMasked: string;
            configured: boolean;
          }>;
        };
      };
      const byMock = new Map(
        (data.settings?.mappings || []).map((m) => [m.simulated.toLowerCase(), m])
      );
      let masksUpdated = 0;
      for (const email of this.uow.mockEmails.list()) {
        const mock = (email.to || "").toLowerCase();
        const mapping = byMock.get(mock);
        if (!mapping?.configured) continue;
        if (email.mappedRecipientMasked === mapping.mappedMasked) continue;
        this.uow.mockEmails.update({
          ...email,
          mappedRecipientMasked: mapping.mappedMasked,
        });
        masksUpdated += 1;
      }
      if (masksUpdated) {
        result.messages.push(
          `${masksUpdated} mappedRecipientMasked value(s) refreshed`
        );
      }
    } catch {
      result.messages.push(
        "Mapped destinations not refreshed (settings API unavailable)"
      );
    }

    this.uow.activity.create({
      id: uid("act-admin-email-repair"),
      employeeId: "",
      onboardingCaseId: "",
      timestamp: nowIso(),
      actor: session.name,
      action: "Repair Administration Email Recipients",
      detail: result.messages.join(" · "),
    });
    this.uow.persist();
    return {
      ok: true as const,
      message: result.messages.join("\n"),
      ...result,
    };
  }

  private reload() {
    this.uow.reload();
    this.ensureRepaired();
  }

  getStore() {
    this.reload();
    return this.uow.snapshot();
  }

  listEmployees() {
    this.reload();
    return this.uow.employees
      .list()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  getEmployee(id: string) {
    this.reload();
    return this.uow.employees.getById(id);
  }

  private ensureOnboardingCase(employee: Employee): boolean {
    if (this.uow.onboardingCases.getByEmployeeId(employee.id)) return false;

    const caseId = uid("onb");
    const caseNumber = `ONB-2026-${String(
      Math.floor(100 + Math.random() * 900)
    ).padStart(4, "0")}`;
    const onboardingCase = {
      id: caseId,
      caseNumber,
      employeeId: employee.id,
      status: "Not Started" as const,
      overallProgress: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastWorkflowTriggeredAt: null,
      lastWorkflowError: null,
      accountCreatedEmailSent: false,
      accountCreatedEmailSentAt: null,
      accountCreatedEmailId: null,
    };
    const tasks = generateChecklistTasks(employee, caseId, this.uow);
    this.uow.onboardingCases.create(onboardingCase);
    this.uow.tasks.createMany(tasks);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "PPG Workday",
      action: "Onboarding case created",
      detail: `${caseNumber} · ${tasks.length} checklist tasks generated`,
    });
    // Auto-assign Induction + Access Card forms for onboarding (not offboarding)
    const adminSession = {
      userId: "user-admin",
      email: "admin@ppg-demo.com",
      name: "OneFlow Admin",
      role: "Admin" as const,
      loggedInAt: nowIso(),
    };
    assignInductionToEmployee(this.uow, adminSession, {
      employeeId: employee.id,
      lifecycleCaseId: caseId,
      lifecycleType: "Onboarding",
      sendEmail: true,
    });
    assignAccessCardToEmployee(this.uow, adminSession, {
      employeeId: employee.id,
      lifecycleCaseId: caseId,
      lifecycleType: "Onboarding",
      sendEmail: true,
    });
    // Conditional laptop requirement workflow (idempotent)
    initializeLaptopRequestForOnboardingCase(this.uow, caseId, {
      actor: "PPG Workday",
    });
    this.uow.persist();
    return true;
  }

  private maybeTriggerOnboarding(
    employee: Employee,
    previousStatus?: Employee["employmentStatus"]
  ): boolean {
    const becameNewHire =
      employee.employmentStatus === "New Hire" && previousStatus !== "New Hire";
    const createdAsNewHire =
      employee.employmentStatus === "New Hire" && previousStatus === undefined;

    if (!becameNewHire && !createdAsNewHire) {
      if (employee.employmentStatus === "New Hire") {
        employee.requiresOnboarding = true;
      }
      return false;
    }

    employee.requiresOnboarding = true;
    employee.employmentStatus = "New Hire";
    return this.ensureOnboardingCase(employee);
  }

  private startWorkflowIfNeeded(employeeId: string, caseCreated: boolean) {
    if (!caseCreated) return;
    const onb = this.uow.onboardingCases.getByEmployeeId(employeeId);
    if (onb) void this.automation.triggerNewHireWorkflow(onb.id);
  }

  private ensureOffboardingCase(employee: Employee): boolean {
    if (this.uow.offboardingCases.getByEmployeeId(employee.id)) return false;
    const lastWorkingDate =
      employee.lastWorkingDate ||
      addDays(new Date().toISOString().slice(0, 10), 14);
    const immediate = Boolean(employee.immediateAccessRemovalRequired);
    const caseId = uid("off");
    const caseNumber = `OFF-2026-${String(
      Math.floor(100 + Math.random() * 900)
    ).padStart(4, "0")}`;
    const tasks = generateOffboardingChecklistTasks(
      { ...employee, lastWorkingDate },
      caseId,
      this.uow,
      { immediate, lastWorkingDate }
    );
    const offboardingCase: OffboardingCase = {
      id: caseId,
      caseNumber,
      employeeId: employee.id,
      status: "Scheduled",
      overallProgress: 0,
      riskLevel: calculateOffboardingRisk(
        { ...employee, lastWorkingDate },
        tasks,
        lastWorkingDate
      ),
      lastWorkingDate,
      terminationType: employee.terminationType || "Resignation",
      terminationReason: employee.terminationReason || "",
      immediateAccessRemovalRequired: immediate,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastWorkflowTriggeredAt: nowIso(),
      lastWorkflowError: null,
      completedAt: null,
    };
    this.uow.offboardingCases.create(offboardingCase);
    this.uow.tasks.createMany(tasks);
    const runId = recordOffboardingAutomationRun({
      uow: this.uow,
      employee,
      caseId,
      taskCount: tasks.length,
      emailCount: 0,
      immediate,
    });
    const emails = buildOffboardingDepartmentEmails({
      employee: { ...employee, lastWorkingDate },
      caseId,
      tasks,
      runId,
      immediate,
    });
    this.uow.mockEmails.createMany(emails);
    const run = this.uow.automationRuns.getById(runId);
    if (run) {
      this.uow.automationRuns.update({
        ...run,
        emailsGenerated: emails.length,
      });
    }
    this.uow.activity.create({
      id: uid("act"),
      employeeId: employee.id,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "PPG Workday",
      action: "Offboarding case created",
      detail: `${caseNumber} · ${tasks.length} checklist tasks generated${
        immediate ? " · IMMEDIATE access removal" : ""
      }`,
    });
    if (immediate) {
      this.uow.activity.create({
        id: uid("act"),
        employeeId: employee.id,
        onboardingCaseId: "",
        offboardingCaseId: caseId,
        timestamp: nowIso(),
        actor: "OneFlow Security",
        action: "Immediate access removal requested",
        detail: "Security-critical tasks marked Urgent and unlocked where possible.",
      });
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    attachExitClearanceToCase(
      this.uow,
      { ...employee, lastWorkingDate },
      caseId
    );
    this.uow.persist();
    return true;
  }

  private maybeTriggerOffboarding(
    employee: Employee,
    previousStatus?: Employee["employmentStatus"]
  ): boolean {
    const becameOffboarding =
      employee.employmentStatus === "Offboarding" &&
      previousStatus !== "Offboarding";
    if (!becameOffboarding && employee.employmentStatus !== "Offboarding") {
      return false;
    }
    if (!becameOffboarding) {
      // already offboarding — ensure case exists once
      return this.ensureOffboardingCase(employee);
    }
    if (!employee.lastWorkingDate) {
      employee.lastWorkingDate = addDays(
        new Date().toISOString().slice(0, 10),
        14
      );
    }
    if (!employee.terminationType) employee.terminationType = "Resignation";
    return this.ensureOffboardingCase(employee);
  }

  createEmployee(input: CreateEmployeeInput) {
    this.reload();
    const ts = nowIso();
    const employee: Employee = {
      ...input,
      id: uid("emp"),
      employeeNumber:
        input.employeeNumber ||
        `MY-${Math.floor(10500 + Math.random() * 900)}`,
      requiresOnboarding: false,
      lastWorkingDate: input.lastWorkingDate ?? null,
      terminationType: input.terminationType ?? null,
      terminationReason: input.terminationReason ?? null,
      immediateAccessRemovalRequired:
        input.immediateAccessRemovalRequired ?? false,
      offboardingStatus: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.uow.employees.create(employee);
    const caseCreated = this.maybeTriggerOnboarding(employee, undefined);
    const offCreated = this.maybeTriggerOffboarding(employee, undefined);
    this.uow.employees.update(employee);
    this.uow.persist();
    this.startWorkflowIfNeeded(employee.id, caseCreated);
    return { employee, caseCreated: caseCreated || offCreated };
  }

  updateEmployee(
    id: string,
    patch: Partial<Omit<Employee, "id" | "createdAt" | "employeeNumber">>
  ) {
    this.reload();
    const previous = this.uow.employees.getById(id);
    if (!previous) throw new Error("Employee not found");
    const employee: Employee = {
      ...previous,
      ...patch,
      id: previous.id,
      employeeNumber: previous.employeeNumber,
      createdAt: previous.createdAt,
      updatedAt: nowIso(),
    };
    const caseCreated = this.maybeTriggerOnboarding(
      employee,
      previous.employmentStatus
    );
    const offCreated = this.maybeTriggerOffboarding(
      employee,
      previous.employmentStatus
    );
    this.uow.employees.update(employee);
    this.uow.persist();
    this.startWorkflowIfNeeded(employee.id, caseCreated);
    return { employee, caseCreated: caseCreated || offCreated };
  }

  listNewHires() {
    this.reload();
    return this.uow.employees
      .list()
      .filter((e) => e.requiresOnboarding || e.employmentStatus === "New Hire");
  }

  listOnboardingCases() {
    this.reload();
    return this.uow.onboardingCases
      .list()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getOnboardingCase(id: string) {
    this.reload();
    return this.uow.onboardingCases.getById(id);
  }

  getCaseByEmployee(employeeId: string) {
    this.reload();
    return this.uow.onboardingCases.getByEmployeeId(employeeId);
  }

  listTasksForCase(caseId: string) {
    this.reload();
    return this.uow.tasks.listByCaseId(caseId);
  }

  listTasksByAssigneeEmail(email: string) {
    this.reload();
    return this.uow.tasks.listByAssigneeEmail(email);
  }

  getTask(id: string) {
    this.reload();
    return this.uow.tasks.getById(id);
  }

  updateTaskStatus(taskId: string, status: TaskStatus, actor = "OneFlow Admin") {
    this.reload();
    const prev = this.uow.tasks.getById(taskId);
    if (!prev) return undefined;

    const offCaseId = prev.offboardingCaseId ?? "";
    const onbCaseId = prev.onboardingCaseId ?? "";
    const isOffboarding = Boolean(offCaseId);
    const caseTasks = isOffboarding
      ? this.uow.tasks.list().filter((t) => t.offboardingCaseId === offCaseId)
      : this.uow.tasks.listByCaseId(onbCaseId);
    if (
      status !== "Blocked" &&
      (prev.status === "Blocked" || isTaskBlockedByDependencies(prev, caseTasks))
    ) {
      // Force blocked state if somehow stale
      if (prev.status !== "Blocked" || prev.blockedReason !== blockedReasonFor(prev, caseTasks)) {
        const forced: ChecklistTask = {
          ...prev,
          status: "Blocked",
          blockedReason: blockedReasonFor(prev, caseTasks),
          completedAt: null,
        };
        this.uow.tasks.update(forced);
        this.uow.persist();
      }
      return undefined;
    }

    // Scheduled access removal: reject premature completion (mock automation)
    if (
      status === "Completed" &&
      prev.executionMode === "Scheduled" &&
      prev.executionDateTime &&
      new Date(prev.executionDateTime).getTime() > Date.now()
    ) {
      return undefined;
    }

    let next: ChecklistTask = {
      ...prev,
      status,
      completedAt:
        status === "Completed" ? prev.completedAt || nowIso() : null,
      assignedOwner: prev.assignedPersonName,
      blockedReason: status === "Blocked" ? prev.blockedReason : null,
      executionStatus:
        status === "Completed" && prev.executionMode
          ? "Completed"
          : prev.executionStatus,
    };

    if (status === "Completed") {
      next = stopAllReminders(next);
    } else if (status === "In Progress" && prev.status === "Pending") {
      next = stopNotStartedReminders(next);
    } else if (status === "Blocked") {
      next = pauseRemindersWhileBlocked(next);
    } else if (status === "Pending" && prev.status === "Blocked") {
      next = restartRemindersFromUnlock(next, nowIso());
      next = { ...next, unlockedAt: next.unlockedAt || nowIso() };
    }

    this.uow.tasks.update(next);

    if (status === "In Progress" && prev.status === "Pending") {
      this.uow.activity.create({
        id: uid("act"),
        employeeId: next.employeeId,
        onboardingCaseId: isOffboarding ? "" : next.onboardingCaseId,
        offboardingCaseId: isOffboarding ? offCaseId : null,
        timestamp: nowIso(),
        actor,
        action: "Task started",
        detail: `${next.title} started by ${actor}.`,
      });
    }

    this.uow.activity.create({
      id: uid("act"),
      employeeId: next.employeeId,
      onboardingCaseId: isOffboarding ? "" : next.onboardingCaseId,
      offboardingCaseId: isOffboarding ? offCaseId : null,
      timestamp: nowIso(),
      actor,
      action: "Task status updated",
      detail: `${next.title} → ${status}`,
    });

    let accountCreatedNotice: string | undefined;
    if (isOffboarding && offCaseId) {
      this.processOffboardingDependencyEffects(offCaseId, actor);
      refreshOffboardingCaseProgress(this.uow, offCaseId);
    } else if (onbCaseId) {
      this.processDependencyEffects(onbCaseId, actor);
      const accountCreated = this.maybeTriggerAccountCreatedWorkflow(
        onbCaseId,
        actor
      );
      accountCreatedNotice = accountCreated.notice;
      this.automation.recalculateProgress(onbCaseId);
    }
    this.uow.persist();
    const task = this.uow.tasks.getById(taskId);
    if (!task) return undefined;
    return {
      task,
      accountCreatedNotice,
    };
  }

  private processOffboardingDependencyEffects(caseId: string, actor: string) {
    const unlocked: ChecklistTask[] = [];
    for (let guard = 0; guard < 12; guard += 1) {
      const working = this.uow.tasks
        .list()
        .filter((t) => t.offboardingCaseId === caseId);
      const batch: ChecklistTask[] = [];
      const newlyUnlocked: ChecklistTask[] = [];

      for (const task of working) {
        const unmet = unmetPrerequisiteTitles(task, working);
        if (unmet.length > 0) {
          const reason = `Waiting for: ${unmet.join(", ")}`;
          if (
            task.status !== "Blocked" ||
            task.blockedReason !== reason ||
            task.completedAt
          ) {
            batch.push({
              ...task,
              status: "Blocked",
              blockedReason: reason,
              completedAt: null,
              unlockedAt: null,
            });
          }
          continue;
        }

        // Keep scheduled security tasks blocked until execution window
        if (
          task.status === "Blocked" &&
          task.executionMode === "Scheduled" &&
          task.executionDateTime &&
          new Date(task.executionDateTime).getTime() > Date.now()
        ) {
          continue;
        }

        if (task.status === "Blocked") {
          const unlockedAt = nowIso();
          let unlockedTask: ChecklistTask = {
            ...task,
            status: "Pending",
            blockedReason: null,
            unlockedAt,
            executionStatus:
              task.executionMode === "Scheduled" ||
              task.executionMode === "Immediate"
                ? "Ready"
                : task.executionStatus,
          };
          unlockedTask = restartRemindersFromUnlock(unlockedTask, unlockedAt);
          batch.push(unlockedTask);
          newlyUnlocked.push(unlockedTask);
        }
      }

      if (!batch.length) break;
      this.uow.tasks.updateMany(batch);
      unlocked.push(...newlyUnlocked);
      if (!newlyUnlocked.length) break;
    }

    for (const t of unlocked) {
      this.uow.activity.create({
        id: uid("act"),
        employeeId: t.employeeId,
        onboardingCaseId: "",
        offboardingCaseId: caseId,
        timestamp: nowIso(),
        actor: "OneFlow Automation",
        action: "Task unlocked",
        detail: `${t.title} unlocked after prerequisite completion.`,
      });
    }
    void actor;
  }

  /**
   * Re-evaluate dependency chain: block dependents with unmet prereqs;
   * unlock newly ready tasks (Blocked → Pending) with activity, automation, email.
   */
  private processDependencyEffects(caseId: string, actor: string) {
    const employeeId =
      this.uow.onboardingCases.getById(caseId)?.employeeId ?? "";
    const employee = this.uow.employees.getById(employeeId);
    const unlocked: ChecklistTask[] = [];

    for (let guard = 0; guard < 12; guard += 1) {
      const working = this.uow.tasks.listByCaseId(caseId);
      const batch: ChecklistTask[] = [];
      const newlyUnlocked: ChecklistTask[] = [];

      for (const task of working) {
        const unmet = unmetPrerequisiteTitles(task, working);
        if (unmet.length > 0) {
          const reason = `Waiting for: ${unmet.join(", ")}`;
          if (
            task.status !== "Blocked" ||
            task.blockedReason !== reason ||
            task.completedAt
          ) {
            batch.push({
              ...task,
              status: "Blocked",
              blockedReason: reason,
              completedAt: null,
              unlockedAt: null,
            });
          }
        } else if (task.status === "Blocked") {
          const unlockedAt = nowIso();
          let unlockedTask: ChecklistTask = {
            ...task,
            status: "Pending",
            blockedReason: null,
            unlockedAt,
          };
          unlockedTask = restartRemindersFromUnlock(unlockedTask, unlockedAt);
          batch.push(unlockedTask);
          newlyUnlocked.push(unlockedTask);
        } else if (task.blockedReason) {
          batch.push({ ...task, blockedReason: null });
        }
      }

      if (!batch.length) break;
      this.uow.tasks.updateMany(batch);
      unlocked.push(...newlyUnlocked);
      if (!newlyUnlocked.length) break;
    }

    if (!unlocked.length || !employee) return;

    for (const t of unlocked) {
      this.uow.activity.create({
        id: uid("act"),
        employeeId: t.employeeId,
        onboardingCaseId: caseId,
        timestamp: nowIso(),
        actor: "OneFlow Automation",
        action: "Task unlocked",
        detail: `${t.title} unlocked after prerequisite completion.`,
      });
    }

    const runId = uid("run");
    const started = nowIso();
    const byTeam = new Map<string, ChecklistTask[]>();
    for (const t of unlocked) {
      const list = byTeam.get(t.responsibleTeam) ?? [];
      list.push(t);
      byTeam.set(t.responsibleTeam, list);
    }

    const emails = [...byTeam.values()]
      .filter((teamTasks) => !shouldSkipGenericOnsiteUnlockEmail(teamTasks))
      .map((teamTasks) =>
        buildUnlockEmail({
          employee,
          onboardingCaseId: caseId,
          unlockedTasks: teamTasks,
          automationRunId: runId,
        })
      )
      .filter((e): e is NonNullable<typeof e> => Boolean(e));

    if (emails.length) {
      this.uow.mockEmails.createMany(emails);
    }

    const titles = unlocked.map((t) => t.title).join(", ");
    const run: AutomationRun = {
      id: runId,
      runNumber: `DEP-${Date.now().toString(36).toUpperCase()}`,
      trigger: "Dependency unlock",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      status: "Successful",
      startedAt: started,
      endedAt: nowIso(),
      durationMs: 50,
      tasksAssigned: unlocked.length,
      emailsGenerated: emails.length,
      errorMessage: null,
      simulateFailure: false,
      steps: [
        {
          id: uid("step"),
          order: 1,
          name: "Unlock dependent tasks",
          status: "Successful",
          detail: `Set Pending: ${titles}`,
          startedAt: started,
          completedAt: nowIso(),
        },
        {
          id: uid("step"),
          order: 2,
          name: "Notify responsible teams",
          status: "Successful",
          detail: `${emails.length} mock email(s) generated · actor ${actor}`,
          startedAt: started,
          completedAt: nowIso(),
        },
      ],
    };
    this.uow.automationRuns.create(run);
    this.mockEngine.processTaskStatusChange(
      unlocked[0].id,
      `Dependency unlock · ${titles}`
    );
  }

  /**
   * When all IT Security account tasks are complete, send Account Created email
   * to Onsite IT Support and record workflow metadata (once per case).
   */
  private maybeTriggerAccountCreatedWorkflow(
    caseId: string,
    actor: string,
    options?: { forceResend?: boolean }
  ): { triggered: boolean; notice?: string; emailId?: string } {
    const onb = this.uow.onboardingCases.getById(caseId);
    if (!onb) return { triggered: false };

    const forceResend = options?.forceResend ?? false;
    if (!forceResend && onb.accountCreatedEmailSent) {
      return { triggered: false };
    }

    const caseTasks = this.uow.tasks.listByCaseId(caseId);
    if (!areItSecurityAccountTasksComplete(caseTasks)) {
      return { triggered: false };
    }

    const employee = this.uow.employees.getById(onb.employeeId);
    if (!employee) return { triggered: false };

    const runId = uid("run");
    const emailId = uid("mail-acct");
    const started = nowIso();
    const email = buildAccountCreatedEmail({
      employee,
      onboardingCaseId: caseId,
      automationRunId: runId,
      emailId,
    });

    this.uow.mockEmails.createMany([email]);

    const laptopTask = caseTasks.find((t) => t.title === "Laptop Assigned");
    if (laptopTask && laptopTask.status === "Blocked") {
      const unlockedAt = started;
      this.uow.tasks.update(
        restartRemindersFromUnlock(
          {
            ...laptopTask,
            status: "Pending",
            blockedReason: null,
            unlockedAt,
          },
          unlockedAt
        )
      );
    }

    const softwareTask = caseTasks.find((t) => t.title === "Software Installed");
    if (softwareTask && softwareTask.status !== "Blocked") {
      const refreshed = this.uow.tasks.listByCaseId(caseId);
      const laptopDone =
        refreshed.find((t) => t.title === "Laptop Assigned")?.status ===
        "Completed";
      if (!laptopDone) {
        this.uow.tasks.update({
          ...softwareTask,
          status: "Blocked",
          blockedReason: "Waiting for: Laptop Assigned",
          completedAt: null,
          unlockedAt: null,
        });
      }
    }

    this.uow.onboardingCases.update({
      ...onb,
      accountCreatedEmailSent: true,
      accountCreatedEmailSentAt: started,
      accountCreatedEmailId: emailId,
      updatedAt: started,
    });

    this.uow.activity.create({
      id: uid("act"),
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: started,
      actor: forceResend ? actor : "OneFlow Automation",
      action: forceResend
        ? "Account Created email resent"
        : "IT Security account creation completed.",
      detail: forceResend
        ? `Account Created email resent to Onsite IT Support by ${actor}.`
        : "IT Security account creation completed.",
    });

    this.uow.activity.create({
      id: uid("act"),
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: started,
      actor: forceResend ? actor : "OneFlow Automation",
      action: forceResend
        ? "Account Created email resent"
        : "Account Created email sent to Onsite IT Support.",
      detail: forceResend
        ? `New mock email ${emailId} sent to Onsite IT Support.`
        : "Account Created email sent to Onsite IT Support.",
    });

    const run: AutomationRun = {
      id: runId,
      runNumber: `ACCT-${Date.now().toString(36).toUpperCase()}`,
      trigger: forceResend
        ? "Account Created email (resend)"
        : "Account Created notification",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      status: "Successful",
      startedAt: started,
      endedAt: nowIso(),
      durationMs: 120,
      tasksAssigned: 1,
      emailsGenerated: 1,
      errorMessage: null,
      simulateFailure: false,
      steps: [
        {
          id: uid("step"),
          order: 1,
          name: "Verify IT Security prerequisites",
          status: "Successful",
          detail:
            "Create Network ID, Create Email, and SailPoint Access completed.",
          startedAt: started,
          completedAt: nowIso(),
        },
        {
          id: uid("step"),
          order: 2,
          name: "Generate Account Created notification",
          status: "Successful",
          detail: `Mock email ${emailId} → ${email.to}`,
          startedAt: started,
          completedAt: nowIso(),
        },
        {
          id: uid("step"),
          order: 3,
          name: "Unlock Onsite IT tasks",
          status: "Successful",
          detail: "Laptop Assigned set to Pending; Software Installed remains blocked.",
          startedAt: started,
          completedAt: nowIso(),
        },
      ],
    };
    this.uow.automationRuns.create(run);

    return {
      triggered: true,
      emailId,
      notice: forceResend
        ? "Account Created email resent to Onsite IT Support."
        : "Account Created notification sent to Onsite IT Support.",
    };
  }

  resendAccountCreatedEmail(caseId: string, actor: string) {
    this.reload();
    const onb = this.uow.onboardingCases.getById(caseId);
    if (!onb) {
      return { ok: false, message: "Onboarding case not found." };
    }
    const caseTasks = this.uow.tasks.listByCaseId(caseId);
    if (!areItSecurityAccountTasksComplete(caseTasks)) {
      return {
        ok: false,
        message:
          "Cannot resend — IT Security account tasks are not all completed.",
      };
    }
    const result = this.maybeTriggerAccountCreatedWorkflow(caseId, actor, {
      forceResend: true,
    });
    this.automation.recalculateProgress(caseId);
    this.uow.persist();
    if (!result.triggered) {
      return { ok: false, message: "Account Created email could not be sent." };
    }
    return {
      ok: true,
      message: result.notice ?? "Account Created email resent.",
      emailId: result.emailId,
    };
  }

  getAccountCreatedEmail(caseId: string) {
    this.reload();
    const onb = this.uow.onboardingCases.getById(caseId);
    if (!onb?.accountCreatedEmailId) return undefined;
    return this.uow.mockEmails.getById(onb.accountCreatedEmailId);
  }

  updateTaskNotes(taskId: string, notes: string, actor = "OneFlow Admin") {
    this.reload();
    const prev = this.uow.tasks.getById(taskId);
    if (!prev) return undefined;
    const caseTasks = this.uow.tasks.listByCaseId(prev.onboardingCaseId);
    if (
      prev.status === "Blocked" ||
      isTaskBlockedByDependencies(prev, caseTasks)
    ) {
      return undefined;
    }
    const next = { ...prev, notes };
    this.uow.tasks.update(next);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: next.employeeId,
      onboardingCaseId: next.onboardingCaseId,
      timestamp: nowIso(),
      actor,
      action: "Task notes updated",
      detail: next.title,
    });
    this.uow.persist();
    return next;
  }

  getActivityForCase(caseId: string) {
    this.reload();
    return this.uow.activity.listByCaseId(caseId);
  }

  getCaseProgress(caseId: string) {
    this.reload();
    return calculateCaseProgress(this.uow.tasks.listByCaseId(caseId));
  }

  getDashboardStats() {
    this.reload();
    const cases = this.uow.onboardingCases.list();
    const tasks = this.uow.tasks.list();
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter((t) => {
      if (t.status === "Completed" || t.status === "Blocked") return false;
      return t.status === "Overdue" || (t.dueDate && t.dueDate < today);
    }).length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const avg =
      cases.length === 0
        ? 0
        : Math.round(
            cases.reduce((s, c) => s + c.overallProgress, 0) / cases.length
          );
    return {
      newHires: this.listNewHires().length,
      openCases: cases.filter((c) => c.status !== "Completed").length,
      completedTasks: completed,
      overdueTasks: overdue,
      avgProgress: avg,
    };
  }

  listAssignmentRules() {
    this.reload();
    return this.uow.assignmentRules.list();
  }

  getSettings() {
    this.reload();
    return this.uow.snapshot().settings;
  }

  setAutomationMode(mode: "simulation" | "live") {
    this.uow.setAutomationMode(mode);
  }

  async retryFailedNotification(
    caseId: string,
    responsibleTeam?: ResponsibleTeam
  ) {
    const result = await this.automation.retryFailedNotification(
      caseId,
      responsibleTeam
    );
    return { ok: result.ok, message: result.message };
  }

  async simulateReminder(caseId: string) {
    const result = await this.automation.simulateReminder(caseId);
    return { ok: result.ok, message: result.message };
  }

  async triggerNewHireWorkflow(caseId: string) {
    const result = await this.automation.triggerNewHireWorkflow(caseId);
    return { ok: result.ok, message: result.message };
  }

  updateTaskStatusAsUser(session: UserSession, taskId: string, status: TaskStatus) {
    this.reload();
    const prev = this.uow.tasks.getById(taskId);
    if (!prev) return { ok: false as const, error: "Task not found." };

    if (isConfirmationTask(prev)) {
      return {
        ok: false as const,
        error:
          "Confirmation tasks must be completed via Confirm / Return for Correction on the Task Detail page.",
      };
    }

    // Route Action status changes through TaskWorkflowService
    if (status === "In Progress") {
      return this.executeTaskWorkflow({
        taskId,
        actingUserId: session.userId,
        session,
        action: "Start",
      });
    }
    if (status === "Completed") {
      const type = normalizeUnifiedTask(prev).taskType;
      if (type === "Approval") {
        return {
          ok: false as const,
          error: "Approval tasks require Approve or Reject on Task Detail.",
        };
      }
      if (type === "Information") {
        return this.executeTaskWorkflow({
          taskId,
          actingUserId: session.userId,
          session,
          action: "Acknowledge",
        });
      }
      if (type === "Review") {
        return this.executeTaskWorkflow({
          taskId,
          actingUserId: session.userId,
          session,
          action: "Complete Review",
        });
      }
      return this.executeTaskWorkflow({
        taskId,
        actingUserId: session.userId,
        session,
        action: "Complete",
      });
    }

    const employee = this.uow.employees.getById(prev.employeeId);
    const caseTasks = prev.offboardingCaseId
      ? this.uow.tasks.list().filter((t) => t.offboardingCaseId === prev.offboardingCaseId)
      : this.uow.tasks.listByCaseId(prev.onboardingCaseId);

    if (
      prev.status === "Blocked" ||
      isTaskBlockedByDependencies(prev, caseTasks)
    ) {
      const unmet = unmetPrerequisiteTitles(prev, caseTasks);
      return {
        ok: false as const,
        error: unmet.length
          ? `Task is blocked until completed: ${unmet.join(", ")}.`
          : "Task is blocked by unmet prerequisites.",
      };
    }

    if (!canUpdateTask(session, prev, employee, caseTasks)) {
      return {
        ok: false as const,
        error:
          "You are not authorized to update this task. Only Admin, the assigned person, or the responsible team may update it.",
      };
    }
    const result = this.updateTaskStatus(taskId, status, session.name);
    if (!result) {
      return {
        ok: false as const,
        error: "Update failed. The task may still be blocked by prerequisites.",
      };
    }
    this.mockEngine.processTaskStatusChange(taskId, `${prev.title} → ${status}`);
    this.uow.persist();
    const notice =
      session.role === "IT_SECURITY" ? result.accountCreatedNotice : undefined;
    return { ok: true as const, task: result.task, notice };
  }

  executeTaskWorkflow(input: ExecuteTaskInput) {
    this.reload();
    const result = this.workflow().executeTask(input);
    if (result.ok) {
      this.mockEngine.processTaskStatusChange(
        input.taskId,
        `${result.task.title} · ${input.action}`
      );
    }
    return result;
  }

  getTaskForUser(session: UserSession, taskId: string) {
    this.reload();
    return this.workflow().assertCanAccessTask(session, taskId);
  }

  repairExitConfirmationLinks(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const summary = repairExitConfirmationData(this.uow, {
      actor: session.name,
      persist: true,
    });
    return { ok: true as const, ...summary };
  }

  updateTaskNotesAsUser(session: UserSession, taskId: string, notes: string) {
    this.reload();
    const prev = this.uow.tasks.getById(taskId);
    if (!prev) return { ok: false as const, error: "Task not found." };
    const employee = this.uow.employees.getById(prev.employeeId);
    const caseTasks = this.uow.tasks.listByCaseId(prev.onboardingCaseId);

    if (
      prev.status === "Blocked" ||
      isTaskBlockedByDependencies(prev, caseTasks)
    ) {
      const unmet = unmetPrerequisiteTitles(prev, caseTasks);
      return {
        ok: false as const,
        error: unmet.length
          ? `Task is blocked until completed: ${unmet.join(", ")}.`
          : "Task is blocked by unmet prerequisites.",
      };
    }

    if (!canUpdateTask(session, prev, employee, caseTasks)) {
      return {
        ok: false as const,
        error:
          "You are not authorized to update this task. Only Admin, the assigned person, or the responsible team may update it.",
      };
    }
    const task = this.updateTaskNotes(taskId, notes, session.name);
    if (!task) return { ok: false as const, error: "Update failed." };
    this.mockEngine.processTaskStatusChange(taskId, `Notes updated · ${prev.title}`);
    this.uow.persist();
    return { ok: true as const, task };
  }

  listTasksForUser(session: UserSession) {
    this.reload();
    return filterTasksForUser(
      session,
      this.uow.tasks.list(),
      this.uow.employees.list()
    );
  }

  listEmailsForUser(session: UserSession) {
    this.reload();
    const emails = this.uow.mockEmails
      .list()
      .filter((e) => e.status !== "Deleted");
    if (session.role === "Admin") return emails;
    const mine = session.email.toLowerCase();
    return emails.filter((e) => {
      if (e.to.toLowerCase() === mine) return true;
      if (e.cc.some((c) => c.toLowerCase() === mine)) return true;
      if (emailMatchesAssignee(session.email, e.to)) return true;
      return e.cc.some((c) => emailMatchesAssignee(session.email, c));
    });
  }

  listAutomationRuns() {
    this.reload();
    return this.uow.automationRuns.list();
  }

  getAutomationRun(id: string) {
    this.reload();
    return this.uow.automationRuns.getById(id);
  }

  async runMockAutomation(
    caseId: string,
    options?: { simulateFailure?: boolean }
  ) {
    this.reload();
    const result = await this.mockEngine.runFullWorkflow(caseId, options);
    return {
      ok: result.ok,
      message: result.message,
      runId: result.run.id,
    };
  }

  async retryAutomationRun(runId: string) {
    this.reload();
    const run = this.uow.automationRuns.getById(runId);
    if (!run) return { ok: false, message: "Automation run not found." };
    return this.runMockAutomation(run.onboardingCaseId, {
      simulateFailure: false,
    });
  }

  markEmailRead(emailId: string, read: boolean) {
    this.reload();
    const email = this.uow.mockEmails.getById(emailId);
    if (!email) return;
    this.uow.mockEmails.update({
      ...email,
      status: read ? "Read" : "Unread",
      readAt: read ? nowIso() : null,
    });
    this.uow.persist();
  }

  deleteEmail(emailId: string) {
    this.reload();
    const email = this.uow.mockEmails.getById(emailId);
    if (!email) return;
    this.uow.mockEmails.update({ ...email, status: "Deleted" });
    this.uow.persist();
  }

  resetDemoEmails() {
    this.reload();
    this.uow.mockEmails.replaceAll([]);
    this.uow.persist();
  }

  /**
   * Deliver / re-deliver a Mock Inbox notification through SES when enabled.
   * Never rolls back workflow state on SES failure.
   */
  async retryFailedEmail(session: UserSession, emailId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    // Ensure legacy administration@ is rewritten before SES resolve
    repairAdministrationRecipientRecords(this.uow);
    this.uow.persist();
    let email = this.uow.mockEmails.getById(emailId);
    if (!email) return { ok: false as const, error: "Notification not found." };
    if ((email.to || "").toLowerCase() === "administration@ppg-demo.com") {
      email = {
        ...email,
        to: ADMIN_MOCK_EMAIL,
        failureReason: null,
      };
      this.uow.mockEmails.update(email);
      this.uow.persist();
    }
    const result = await deliverMockEmailWithProvider(this.uow, email, session, {
      forceResend: true,
      action: "retryFailedEmail",
      skipIfAlreadySent: false,
    });
    this.uow.activity.create({
      id: uid("act-email-retry"),
      employeeId: email.employeeId,
      onboardingCaseId: email.onboardingCaseId,
      timestamp: nowIso(),
      actor: session.name,
      action: "Retry Failed Email",
      detail: `${email.subject} · ${result.ok ? "ok" : result.error}`,
    });
    this.uow.persist();
    return result.ok
      ? { ok: true as const, message: "Retry completed.", email: result.email }
      : { ok: false as const, error: result.error || "Retry failed.", email: result.email };
  }

  async resendWorkflowEmail(session: UserSession, emailId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    repairAdministrationRecipientRecords(this.uow);
    this.uow.persist();
    let email = this.uow.mockEmails.getById(emailId);
    if (!email) return { ok: false as const, error: "Notification not found." };
    if ((email.to || "").toLowerCase() === "administration@ppg-demo.com") {
      email = { ...email, to: ADMIN_MOCK_EMAIL, failureReason: null };
      this.uow.mockEmails.update(email);
      this.uow.persist();
    }
    const result = await deliverMockEmailWithProvider(this.uow, email, session, {
      forceResend: true,
      action: "resendWorkflowEmail" as WorkflowEmailAction,
      skipIfAlreadySent: false,
    });
    this.uow.activity.create({
      id: uid("act-email-resend"),
      employeeId: email.employeeId,
      onboardingCaseId: email.onboardingCaseId,
      timestamp: nowIso(),
      actor: session.name,
      action: "Resend Workflow Email",
      detail: `${email.subject} · status ${result.email.deliveryStatus}`,
    });
    this.uow.persist();
    return result.ok
      ? { ok: true as const, message: "Resend completed.", email: result.email }
      : { ok: false as const, error: result.error || "Resend failed.", email: result.email };
  }

  async deliverWorkflowEmailNow(
    session: UserSession,
    emailId: string,
    action?: WorkflowEmailAction
  ) {
    this.reload();
    if (session.role === "ONBOARDING_EMPLOYEE" || session.role === "OFFBOARDING_EMPLOYEE") {
      return { ok: false as const, error: "Employees cannot trigger external email delivery." };
    }
    const email = this.uow.mockEmails.getById(emailId);
    if (!email) return { ok: false as const, error: "Notification not found." };
    return deliverMockEmailWithProvider(this.uow, email, session, {
      action,
      skipIfAlreadySent: true,
    });
  }

  getEmailDeliveryDetails(session: UserSession, emailId: string) {
    this.reload();
    if (session.role !== "Admin" && session.role !== "HR") {
      return { ok: false as const, error: "Not authorized." };
    }
    const email = this.uow.mockEmails.getById(emailId);
    if (!email) return { ok: false as const, error: "Not found." };
    return {
      ok: true as const,
      details: {
        id: email.id,
        subject: email.subject,
        simulatedRecipient: email.to,
        mappedRecipientMasked: email.mappedRecipientMasked || "—",
        provider: email.provider || "none",
        deliveryMode: email.deliveryMode || "mock",
        deliveryStatus: email.deliveryStatus || "Pending",
        providerMessageId: email.providerMessageId || null,
        sentAt: email.deliveredAt || email.sentAt,
        failedAt: email.failedAt || null,
        failureReason: email.failureReason || null,
        attemptCount: email.deliveryAttemptCount || 0,
        lastAttemptAt: email.lastAttemptAt || null,
        notificationType: email.notificationType || null,
      },
    };
  }

  resetToSeed(options?: {
    resetTemplates?: boolean;
    preserveCases?: boolean;
  }) {
    this.reload();
    const seed = createSeedStore();
    const resetTemplates = options?.resetTemplates ?? true;
    const preserveCases = options?.preserveCases ?? false;

    const checklistTemplates = resetTemplates
      ? seed.checklistTemplates
      : this.uow.checklistTemplates.list();
    const checklistTemplateAudits = resetTemplates
      ? []
      : this.uow.checklistTemplateAudits.list();
    const exitClearanceTemplates = resetTemplates
      ? seed.exitClearanceTemplates
      : this.uow.exitClearanceTemplates.list();

    this.uow.reset({
      employees: seed.employees,
      onboardingCases: preserveCases
        ? this.uow.onboardingCases.list()
        : seed.onboardingCases,
      offboardingCases: preserveCases
        ? this.uow.offboardingCases.list()
        : seed.offboardingCases,
      tasks: preserveCases ? this.uow.tasks.list() : seed.tasks,
      activity: preserveCases ? this.uow.activity.list() : seed.activity,
      assignmentRules: seed.assignmentRules,
      mockEmails: preserveCases ? this.uow.mockEmails.list() : seed.mockEmails,
      automationRuns: preserveCases
        ? this.uow.automationRuns.list()
        : seed.automationRuns,
      checklistTemplates,
      checklistTemplateAudits,
      exitClearanceForms: preserveCases
        ? this.uow.exitClearanceForms.list()
        : seed.exitClearanceForms,
      exitClearanceTemplates,
      inductionForms: preserveCases
        ? this.uow.inductionForms.list()
        : seed.inductionForms,
      accessCardForms: preserveCases
        ? this.uow.accessCardForms.list()
        : seed.accessCardForms,
      laptopRequests: preserveCases
        ? this.uow.laptopRequests.list()
        : seed.laptopRequests,
    });
    this.repairRan = false;
    return this.uow.snapshot();
  }

  private requireAdmin(session: UserSession): string | null {
    if (session.role !== "Admin") {
      return "Only Admin may manage checklist templates.";
    }
    return null;
  }

  private writeTemplateAudit(
    action: ChecklistTemplateAudit["action"],
    task: ChecklistTemplateTask,
    changedBy: string,
    before: Partial<ChecklistTemplateTask> | null,
    after: Partial<ChecklistTemplateTask> | null
  ) {
    this.uow.checklistTemplateAudits.create({
      id: uid("taud"),
      action,
      templateTaskId: task.id,
      taskTitle: task.title,
      changedBy,
      changedAt: nowIso(),
      before,
      after,
    });
  }

  listChecklistTemplates() {
    this.reload();
    return sortTemplates(this.uow.checklistTemplates.list());
  }

  listChecklistTemplateAudits() {
    this.reload();
    return this.uow.checklistTemplateAudits.list().slice(0, 40);
  }

  getChecklistTemplate(id: string) {
    this.reload();
    return this.uow.checklistTemplates.getById(id);
  }

  previewOnboardingChecklist() {
    this.reload();
    return sortTemplates(
      this.uow.checklistTemplates
        .listActive()
        .filter((t) => (t.processType ?? "Onboarding") === "Onboarding")
    );
  }

  previewOffboardingChecklist() {
    this.reload();
    return sortTemplates(
      this.uow.checklistTemplates
        .listActive()
        .filter((t) => t.processType === "Offboarding")
    );
  }

  isTemplateTaskUsedInCases(templateTaskId: string) {
    this.reload();
    const tmpl = this.uow.checklistTemplates.getById(templateTaskId);
    return this.uow.tasks.list().some(
      (t) =>
        t.templateTaskId === templateTaskId ||
        (!t.templateTaskId && tmpl && t.title === tmpl.title)
    );
  }

  createChecklistTemplate(
    session: UserSession,
    input: ChecklistTemplateTaskInput
  ) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };

    const error = validateTemplateTaskInput(
      input,
      this.uow.checklistTemplates.list()
    );
    if (error) return { ok: false as const, error };

    const ts = nowIso();
    const task: ChecklistTemplateTask = {
      id: uid("tmpl"),
      processType: input.processType ?? "Onboarding",
      checklistGroup: input.checklistGroup,
      responsibleTeam: input.responsibleTeam,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      active: input.active ?? true,
      required: input.required ?? true,
      sortOrder: input.sortOrder,
      dueOffsetDays: input.dueOffsetDays,
      dependencyTemplateTaskIds: [...(input.dependencyTemplateTaskIds ?? [])],
      assignedEmailRule: input.assignedEmailRule,
      fixedAssignedEmail:
        input.assignedEmailRule === "Fixed Team Email"
          ? input.fixedAssignedEmail.trim()
          : "",
      reminderEnabled: input.reminderEnabled ?? true,
      firstReminderAfterWorkingDays: input.firstReminderAfterWorkingDays ?? 2,
      reminderFrequencyWorkingDays: input.reminderFrequencyWorkingDays ?? 2,
      maximumReminderCount: input.maximumReminderCount ?? 2,
      escalationAfterWorkingDays: input.escalationAfterWorkingDays ?? 6,
      escalationEmailRule: input.escalationEmailRule ?? "Admin",
      fixedEscalationEmail:
        input.escalationEmailRule === "Fixed Email"
          ? (input.fixedEscalationEmail ?? "").trim()
          : "",
      securityCritical: input.securityCritical ?? false,
      executionMode: input.executionMode ?? null,
      createdAt: ts,
      updatedAt: ts,
      createdBy: session.name,
      updatedBy: session.name,
    };
    this.uow.checklistTemplates.create(task);
    this.writeTemplateAudit("add", task, session.name, null, task);
    this.uow.persist();
    return { ok: true as const, task };
  }

  updateChecklistTemplate(
    session: UserSession,
    id: string,
    input: ChecklistTemplateTaskInput
  ) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };

    const prev = this.uow.checklistTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template task not found." };

    const error = validateTemplateTaskInput(
      input,
      this.uow.checklistTemplates.list(),
      id
    );
    if (error) return { ok: false as const, error };

    const next: ChecklistTemplateTask = {
      ...prev,
      processType: input.processType ?? prev.processType ?? "Onboarding",
      checklistGroup: input.checklistGroup,
      responsibleTeam: input.responsibleTeam,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      active: input.active ?? prev.active,
      required: input.required ?? prev.required,
      sortOrder: input.sortOrder,
      dueOffsetDays: input.dueOffsetDays,
      dependencyTemplateTaskIds: [...(input.dependencyTemplateTaskIds ?? [])],
      assignedEmailRule: input.assignedEmailRule,
      fixedAssignedEmail:
        input.assignedEmailRule === "Fixed Team Email"
          ? input.fixedAssignedEmail.trim()
          : "",
      reminderEnabled: input.reminderEnabled ?? prev.reminderEnabled,
      firstReminderAfterWorkingDays:
        input.firstReminderAfterWorkingDays ??
        prev.firstReminderAfterWorkingDays,
      reminderFrequencyWorkingDays:
        input.reminderFrequencyWorkingDays ??
        prev.reminderFrequencyWorkingDays,
      maximumReminderCount:
        input.maximumReminderCount ?? prev.maximumReminderCount,
      escalationAfterWorkingDays:
        input.escalationAfterWorkingDays ?? prev.escalationAfterWorkingDays,
      escalationEmailRule:
        input.escalationEmailRule ?? prev.escalationEmailRule,
      fixedEscalationEmail:
        (input.escalationEmailRule ?? prev.escalationEmailRule) === "Fixed Email"
          ? (input.fixedEscalationEmail ?? prev.fixedEscalationEmail ?? "").trim()
          : "",
      securityCritical: input.securityCritical ?? prev.securityCritical ?? false,
      executionMode:
        input.executionMode !== undefined
          ? input.executionMode
          : (prev.executionMode ?? null),
      updatedAt: nowIso(),
      updatedBy: session.name,
    };
    this.uow.checklistTemplates.update(next);
    this.writeTemplateAudit("edit", next, session.name, prev, next);
    this.uow.persist();
    return { ok: true as const, task: next };
  }

  duplicateChecklistTemplate(session: UserSession, id: string) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };
    const prev = this.uow.checklistTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template task not found." };

    const siblings = this.uow.checklistTemplates
      .list()
      .filter((t) => t.checklistGroup === prev.checklistGroup);
    const maxOrder = Math.max(0, ...siblings.map((t) => t.sortOrder));

    return this.createChecklistTemplate(session, {
      processType: prev.processType ?? "Onboarding",
      checklistGroup: prev.checklistGroup,
      responsibleTeam: prev.responsibleTeam,
      title: `${prev.title} (Copy)`,
      description: prev.description,
      active: false,
      required: prev.required,
      sortOrder: maxOrder + 10,
      dueOffsetDays: prev.dueOffsetDays,
      dependencyTemplateTaskIds: [...prev.dependencyTemplateTaskIds],
      assignedEmailRule: prev.assignedEmailRule,
      fixedAssignedEmail: prev.fixedAssignedEmail,
      reminderEnabled: prev.reminderEnabled,
      firstReminderAfterWorkingDays: prev.firstReminderAfterWorkingDays,
      reminderFrequencyWorkingDays: prev.reminderFrequencyWorkingDays,
      maximumReminderCount: prev.maximumReminderCount,
      escalationAfterWorkingDays: prev.escalationAfterWorkingDays,
      escalationEmailRule: prev.escalationEmailRule,
      fixedEscalationEmail: prev.fixedEscalationEmail,
      securityCritical: prev.securityCritical ?? false,
      executionMode: prev.executionMode ?? null,
    });
  }

  reorderChecklistTemplate(
    session: UserSession,
    id: string,
    sortOrder: number
  ) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };
    const prev = this.uow.checklistTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template task not found." };
    if (!Number.isFinite(sortOrder) || sortOrder < 1) {
      return { ok: false as const, error: "Sort order must be a positive number." };
    }
    const next = {
      ...prev,
      sortOrder,
      updatedAt: nowIso(),
      updatedBy: session.name,
    };
    this.uow.checklistTemplates.update(next);
    this.writeTemplateAudit("reorder", next, session.name, prev, next);
    this.uow.persist();
    return { ok: true as const, task: next };
  }

  setChecklistTemplateActive(
    session: UserSession,
    id: string,
    active: boolean
  ) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };
    const prev = this.uow.checklistTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template task not found." };
    const next = {
      ...prev,
      active,
      updatedAt: nowIso(),
      updatedBy: session.name,
    };
    this.uow.checklistTemplates.update(next);
    this.writeTemplateAudit(
      active ? "activate" : "deactivate",
      next,
      session.name,
      prev,
      next
    );
    this.uow.persist();
    return { ok: true as const, task: next };
  }

  deleteChecklistTemplate(session: UserSession, id: string) {
    this.reload();
    const denied = this.requireAdmin(session);
    if (denied) return { ok: false as const, error: denied };
    const prev = this.uow.checklistTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template task not found." };

    if (this.isTemplateTaskUsedInCases(id)) {
      return {
        ok: false as const,
        error:
          "This template task has been used in onboarding cases and cannot be permanently deleted. Deactivate it instead.",
        suggestDeactivate: true,
      };
    }

    this.uow.checklistTemplates.delete(id);
    this.writeTemplateAudit("delete", prev, session.name, prev, null);
    this.uow.persist();
    return { ok: true as const };
  }

  runReminderCheck(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return {
        ok: false as const,
        error: "Only Admin may run reminder checks.",
      };
    }
    const summary = this.reminderEngine.evaluateReminders(new Date());
    this.uow.persist();
    return {
      ok: true as const,
      message: `Reminder check complete: ${summary.tasksChecked} tasks checked, ${summary.remindersGenerated} reminders, ${summary.overdueNotificationsGenerated} overdue, ${summary.escalationsGenerated} escalations.`,
      summary,
    };
  }

  sendTaskReminderNow(session: UserSession, taskId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Only Admin may send reminders." };
    }
    const task = this.uow.tasks.getById(taskId);
    if (!task) return { ok: false as const, error: "Task not found." };
    const employee = this.uow.employees.getById(task.employeeId);
    if (!employee) return { ok: false as const, error: "Employee not found." };
    if (task.status === "Completed" || task.status === "Blocked") {
      return {
        ok: false as const,
        error: "Cannot remind a completed or blocked task.",
      };
    }
    const runId = uid("run");
    const to = task.assignedEmail || "admin@ppg-demo.com";
    const result = this.reminderEngine.sendTaskReminder(
      [task],
      employee,
      to || "admin@ppg-demo.com",
      runId
    );
    if (!result) return { ok: false as const, error: "Reminder failed." };
    // createMany is hooked → NotificationService delivers via SES automatically
    this.uow.mockEmails.createMany([result.email]);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: nowIso(),
      actor: session.name,
      action: "Manual reminder",
      detail: `Send Reminder Now · ${task.title}`,
    });
    this.uow.persist();
    return {
      ok: true as const,
      message: "Reminder queued (Mock Inbox + SES if enabled).",
    };
  }

  rescheduleTaskReminder(
    session: UserSession,
    taskId: string,
    nextReminderDueAt: string
  ) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Only Admin may reschedule reminders." };
    }
    const task = this.uow.tasks.getById(taskId);
    if (!task) return { ok: false as const, error: "Task not found." };
    const next: ChecklistTask = {
      ...task,
      nextReminderDueAt,
      reminderStatus:
        task.reminderStatus === "Stopped" || task.reminderStatus === "Not Required"
          ? task.reminderStatus
          : "Scheduled",
    };
    this.uow.tasks.update(next);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: nowIso(),
      actor: session.name,
      action: "Reminder rescheduled",
      detail: `${task.title} next reminder set to ${nextReminderDueAt.slice(0, 10)}.`,
    });
    this.uow.persist();
    return { ok: true as const, message: "Reminder rescheduled.", task: next };
  }

  stopTaskReminders(session: UserSession, taskId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Only Admin may stop reminders." };
    }
    const task = this.reminderEngine.stopTaskReminders(taskId, session.name);
    if (!task) return { ok: false as const, error: "Task not found." };
    this.uow.persist();
    return { ok: true as const, message: "Reminders stopped.", task };
  }

  resendTaskEscalation(session: UserSession, taskId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Only Admin may resend escalations." };
    }
    const task = this.uow.tasks.getById(taskId);
    if (!task) return { ok: false as const, error: "Task not found." };
    const employee = this.uow.employees.getById(task.employeeId);
    if (!employee) return { ok: false as const, error: "Employee not found." };
    const runId = uid("run");
    const email = this.reminderEngine.escalateTask(task, employee, runId, true);
    if (!email) return { ok: false as const, error: "Escalation failed." };
    this.uow.mockEmails.createMany([email]);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: task.onboardingCaseId,
      timestamp: nowIso(),
      actor: session.name,
      action: "Escalation resent",
      detail: `Resend Escalation · ${task.title}`,
    });
    this.uow.persist();
    return { ok: true as const, message: "Escalation resent to Mock Inbox." };
  }

  listOffboardingCases() {
    this.reload();
    return this.uow.offboardingCases
      .list()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getOffboardingCase(id: string) {
    this.reload();
    return this.uow.offboardingCases.getById(id);
  }

  getOffboardingCaseByEmployee(employeeId: string) {
    this.reload();
    return this.uow.offboardingCases.getByEmployeeId(employeeId);
  }

  listTasksForOffboardingCase(caseId: string) {
    this.reload();
    return this.uow.tasks
      .list()
      .filter((t) => t.offboardingCaseId === caseId);
  }

  getOffboardingProgress(caseId: string) {
    this.reload();
    return calculateCaseProgress(this.listTasksForOffboardingCase(caseId));
  }

  listActivityForOffboardingCase(caseId: string) {
    this.reload();
    return this.uow.activity
      .list()
      .filter((a) => a.offboardingCaseId === caseId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  listEmailsForOffboardingCase(caseId: string) {
    this.reload();
    return this.uow.mockEmails
      .list()
      .filter(
        (e) =>
          e.onboardingCaseId === caseId &&
          e.subject.toLowerCase().includes("offboarding")
      )
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  getOffboardingDashboardStats() {
    this.reload();
    const cases = this.uow.offboardingCases.list();
    const today = new Date().toISOString().slice(0, 10);
    const active = cases.filter((c) => c.status !== "Completed" && c.status !== "Cancelled");
    const upcoming = cases.filter(
      (c) =>
        c.status !== "Completed" &&
        c.status !== "Cancelled" &&
        c.lastWorkingDate >= today
    );
    const tasks = this.uow.tasks.list().filter((t) => t.processType === "Offboarding");
    const assetsAwaiting = tasks.filter(
      (t) =>
        this.isAssetReturnTask(t) &&
        t.status !== "Completed" &&
        t.status !== "Blocked"
    ).length;
    const accessPending = tasks.filter(
      (t) =>
        t.securityCritical &&
        t.status !== "Completed" &&
        t.status !== "Blocked"
    ).length;
    const criticalRisk = active.filter(
      (c) => c.riskLevel === "Critical" || c.riskLevel === "Security Risk"
    ).length;
    const avgProgress =
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((s, c) => s + c.overallProgress, 0) / active.length
          );
    return {
      activeCases: active.length,
      upcomingDepartures: upcoming.length,
      assetsAwaitingReturn: assetsAwaiting,
      accessRemovalPending: accessPending,
      criticalRisk,
      avgProgress,
    };
  }

  createSampleOffboardingCase() {
    this.reload();
    const candidate =
      this.uow.employees
        .list()
        .find(
          (e) =>
            e.employmentStatus === "Active" &&
            !this.uow.offboardingCases.getByEmployeeId(e.id)
        ) ?? this.uow.employees.list()[0];
    if (!candidate) throw new Error("No employees available for sample case.");
    const lastWorkingDate = addDays(new Date().toISOString().slice(0, 10), 14);
    const { employee } = this.updateEmployee(candidate.id, {
      employmentStatus: "Offboarding",
      lastWorkingDate,
      terminationType: "Resignation" as TerminationType,
      terminationReason: "Sample demo departure",
      immediateAccessRemovalRequired: false,
    });
    const offboardingCase = this.uow.offboardingCases.getByEmployeeId(employee.id)!;
    return { employee, offboardingCase };
  }

  advanceToLastWorkingDay(caseId: string) {
    this.reload();
    const offCase = this.uow.offboardingCases.getById(caseId);
    if (!offCase) return undefined;
    const today = new Date().toISOString().slice(0, 10);
    const now = nowIso();
    let employee = this.uow.employees.getById(offCase.employeeId);
    if (employee) {
      employee = {
        ...employee,
        lastWorkingDate: today,
        updatedAt: now,
      };
      this.uow.employees.update(employee);
    }
    this.uow.offboardingCases.update({
      ...offCase,
      lastWorkingDate: today,
      updatedAt: now,
    });
    // Unlock scheduled access-removal window for demo
    for (const task of this.listTasksForOffboardingCase(caseId)) {
      if (task.executionMode !== "Scheduled") continue;
      this.uow.tasks.update({
        ...task,
        executionDateTime: now,
        executionStatus: "Ready",
        dueDate: today,
      });
    }
    this.processOffboardingDependencyEffects(caseId, "OneFlow Demo");
    this.uow.activity.create({
      id: uid("act"),
      employeeId: offCase.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: now,
      actor: "OneFlow Demo",
      action: "Last working day reached",
      detail: `Last working date advanced to ${today} for presentation demo.`,
    });
    if (employee) {
      this.uow.mockEmails.createMany([
        buildOffboardingEventEmail({
          employee,
          caseId,
          kind: "upcoming-last-day",
          to: "hr@ppg-demo.com",
        }),
        buildOffboardingEventEmail({
          employee,
          caseId,
          kind: "scheduled-access-removal",
          to: "itsecurity@ppg-demo.com",
        }),
        buildOffboardingEventEmail({
          employee,
          caseId,
          kind: "asset-return-reminder",
          to: "itsupport@ppg-demo.com",
        }),
      ]);
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  simulateAssetReturn(caseId: string) {
    this.reload();
    const tasks = this.listTasksForOffboardingCase(caseId);
    for (const task of tasks) {
      if (!this.isAssetReturnTask(task)) continue;
      if (task.status === "Completed") continue;
      this.completeOffboardingTask(task, "OneFlow Demo");
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: this.uow.offboardingCases.getById(caseId)!.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Demo",
      action: "Asset return simulated",
      detail: "Marked asset recovery tasks as completed.",
    });
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  simulateAccessRemoval(caseId: string) {
    this.reload();
    const tasks = this.listTasksForOffboardingCase(caseId);
    for (const task of tasks) {
      if (!task.securityCritical) continue;
      if (task.status === "Completed") continue;
      this.completeOffboardingTask(task, "OneFlow Demo");
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: this.uow.offboardingCases.getById(caseId)!.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Demo",
      action: "Access removal simulated",
      detail: "Marked security-critical access tasks as completed.",
    });
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  simulateMissingLaptop(caseId: string) {
    this.reload();
    this.advanceToLastWorkingDay(caseId);
    const laptop = this.listTasksForOffboardingCase(caseId).find(
      (t) => t.title === "Recover laptop"
    );
    if (laptop && laptop.status === "Completed") {
      this.uow.tasks.update({
        ...laptop,
        status: "Pending",
        completedAt: null,
      });
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: this.uow.offboardingCases.getById(caseId)!.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Demo",
      action: "Missing laptop scenario",
      detail: "Laptop not returned after last working day — risk elevated.",
    });
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  simulateAccessStillActive(caseId: string) {
    this.reload();
    this.advanceToLastWorkingDay(caseId);
    this.reload();
    const confirmLast = this.listTasksForOffboardingCase(caseId).find(
      (t) => t.title === "Confirm last working date"
    );
    if (confirmLast && confirmLast.status !== "Completed") {
      this.completeOffboardingTask(confirmLast, "OneFlow Demo");
      this.processOffboardingDependencyEffects(caseId, "OneFlow Demo");
    }
    const isCriticalAccess = (task: ChecklistTask) =>
      task.title.toLowerCase().includes("network id") ||
      task.title === "Disable email account" ||
      task.title === "Disable building access";
    for (const task of this.listTasksForOffboardingCase(caseId)) {
      if (!isCriticalAccess(task)) continue;
      this.uow.tasks.update({
        ...task,
        status: "Pending",
        blockedReason: null,
        completedAt: null,
        executionStatus: "Overdue",
        dueDate: addDays(new Date().toISOString().slice(0, 10), -1),
      });
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    const emp = this.uow.employees.getById(
      this.uow.offboardingCases.getById(caseId)!.employeeId
    );
    this.uow.activity.create({
      id: uid("act"),
      employeeId: this.uow.offboardingCases.getById(caseId)!.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Demo",
      action: "Access still active scenario",
      detail: "Critical access removal tasks remain open after last day.",
    });
    if (emp) {
      this.uow.mockEmails.createMany([
        buildOffboardingEventEmail({
          employee: emp,
          caseId,
          kind: "overdue-access-removal",
          to: "itsecurity@ppg-demo.com",
        }),
      ]);
    }
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  completeOffboarding(caseId: string) {
    this.reload();
    for (const task of this.listTasksForOffboardingCase(caseId)) {
      if (task.required === false) continue;
      if (task.status === "Completed") continue;
      if (task.status === "Blocked") {
        this.uow.tasks.update({
          ...task,
          status: "Pending",
          blockedReason: null,
          unlockedAt: nowIso(),
        });
      }
      const current = this.uow.tasks.getById(task.id)!;
      this.completeOffboardingTask(current, "OneFlow Demo");
    }
    refreshOffboardingCaseProgress(this.uow, caseId);
    const off = this.uow.offboardingCases.getById(caseId)!;
    const emp = this.uow.employees.getById(off.employeeId);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: off.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Demo",
      action: "Offboarding completed",
      detail: "All required checklist tasks marked complete.",
    });
    if (emp) {
      this.uow.mockEmails.createMany([
        buildOffboardingEventEmail({
          employee: emp,
          caseId,
          kind: "completed",
          to: "hr@ppg-demo.com",
        }),
      ]);
    }
    this.uow.persist();
    return this.uow.offboardingCases.getById(caseId);
  }

  private isAssetReturnTask(task: ChecklistTask): boolean {
    const title = task.title.toLowerCase();
    return (
      title.includes("recover") ||
      title.includes("asset inventory") ||
      title.includes("backup") ||
      title.includes("wipe")
    );
  }

  private completeOffboardingTask(task: ChecklistTask, actor: string) {
    const next: ChecklistTask = {
      ...stopAllReminders(task),
      status: "Completed",
      completedAt: nowIso(),
      executionStatus: task.securityCritical ? "Completed" : task.executionStatus,
    };
    this.uow.tasks.update(next);
    this.uow.activity.create({
      id: uid("act"),
      employeeId: task.employeeId,
      onboardingCaseId: "",
      offboardingCaseId: task.offboardingCaseId ?? null,
      timestamp: nowIso(),
      actor,
      action: "Task status updated",
      detail: `${task.title} → Completed`,
    });
  }

  // —— Employee Exit Clearance Form ——

  getExitClearanceForm(id: string) {
    this.reload();
    return this.uow.exitClearanceForms.getById(id);
  }

  getExitClearanceFormByCase(caseId: string) {
    this.reload();
    return this.uow.exitClearanceForms.getByCaseId(caseId);
  }

  getExitClearanceFormForEmployee(employeeId: string) {
    this.reload();
    return this.uow.exitClearanceForms.getByEmployeeId(employeeId);
  }

  listExitClearanceForms() {
    this.reload();
    return this.uow.exitClearanceForms.list();
  }

  getExitFormProgress(formId: string) {
    this.reload();
    const form = this.uow.exitClearanceForms.getById(formId);
    if (!form) {
      return {
        employeeSubmission: "Not Started" as const,
        requiredConfirmations: 0,
        confirmedCount: 0,
        percent: 0,
        pendingDepartments: [] as string[],
        correctionItems: 0,
        rejectedItems: 0,
      };
    }
    return calculateExitFormProgress(form);
  }

  openExitClearanceForm(session: UserSession, formId: string) {
    this.reload();
    return openExitForm(this.uow, session, formId);
  }

  saveExitClearanceDraft(
    session: UserSession,
    formId: string,
    patch: ExitFormEmployeePatch
  ) {
    this.reload();
    return saveExitDraft(this.uow, session, formId, patch);
  }

  submitExitClearanceForm(
    session: UserSession,
    formId: string,
    patch: ExitFormEmployeePatch
  ) {
    this.reload();
    return submitExitForm(this.uow, session, formId, patch);
  }

  confirmExitClearanceItem(
    session: UserSession,
    args: {
      formId: string;
      itemId: string;
      action:
        | "Start Review"
        | "Confirm"
        | "Reject"
        | "Return for Correction";
      name?: string;
      initial?: string;
      remarks?: string;
    }
  ) {
    this.reload();
    return confirmExitItem(this.uow, session, args);
  }

  populateSampleExitAnswers(session: UserSession, formId: string) {
    this.reload();
    return populateSampleExitForm(this.uow, session, formId);
  }

  resetDanielExitFormJourney(session: UserSession) {
    this.reload();
    return resetDanielExitJourney(this.uow, session);
  }

  confirmAllExitConfirmations(session: UserSession, formId: string) {
    this.reload();
    return confirmAllExitItems(this.uow, session, formId);
  }

  adminSendExitFormEmail(session: UserSession, formId: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const form = this.uow.exitClearanceForms.getById(formId);
    if (!form) return { ok: false as const, error: "Form not found." };
    const employee = this.uow.employees.getById(form.employeeId);
    if (!employee) return { ok: false as const, error: "Employee not found." };
    const runId = recordExitAutomationRun({
      uow: this.uow,
      employee,
      caseId: form.offboardingCaseId,
      trigger: "Exit form email resent",
      taskCount: 0,
      emailCount: 1,
    });
    const email = buildInitialExitFormEmail({ form, runId });
    this.uow.mockEmails.createMany([email]);
    const next = {
      ...form,
      formStatus:
        form.formStatus === "Not Sent" ? ("Sent" as const) : form.formStatus,
      initialEmailId: email.id,
      updatedAt: nowIso(),
    };
    this.uow.exitClearanceForms.update(next);
    this.uow.activity.create(
      exitActivity(
        form.employeeId,
        form.offboardingCaseId,
        session.name,
        "Exit form email sent",
        "Admin resent Exit Clearance Form email"
      )
    );
    this.uow.persist();
    return { ok: true as const, form: next, emailId: email.id };
  }

  listExitClearanceTemplates() {
    this.reload();
    return this.uow.exitClearanceTemplates.list();
  }

  createExitClearanceTemplate(
    session: UserSession,
    input: ExitClearanceTemplateItemInput
  ) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const ts = nowIso();
    const item: ExitClearanceTemplateItem = {
      id: uid("exit-tmpl"),
      sequenceNumber: input.sequenceNumber,
      title: input.title,
      description: input.description,
      confirmationDepartment: input.confirmationDepartment,
      confirmationRole: input.confirmationRole,
      assignmentEmailRule: input.assignmentEmailRule,
      fixedAssignedEmail: input.fixedAssignedEmail,
      conditionalFields: input.conditionalFields ?? [],
      alwaysRequiresConfirmation: input.alwaysRequiresConfirmation ?? false,
      active: input.active ?? true,
      sortOrder: input.sortOrder,
      createdAt: ts,
      updatedAt: ts,
      createdBy: session.name,
      updatedBy: session.name,
    };
    this.uow.exitClearanceTemplates.create(item);
    this.uow.persist();
    return { ok: true as const, item };
  }

  updateExitClearanceTemplate(
    session: UserSession,
    id: string,
    input: ExitClearanceTemplateItemInput
  ) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const prev = this.uow.exitClearanceTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template not found." };
    const item: ExitClearanceTemplateItem = {
      ...prev,
      ...input,
      id: prev.id,
      updatedAt: nowIso(),
      updatedBy: session.name,
    };
    this.uow.exitClearanceTemplates.update(item);
    this.uow.persist();
    return { ok: true as const, item };
  }

  setExitClearanceTemplateActive(
    session: UserSession,
    id: string,
    active: boolean
  ) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const prev = this.uow.exitClearanceTemplates.getById(id);
    if (!prev) return { ok: false as const, error: "Template not found." };
    const item = {
      ...prev,
      active,
      updatedAt: nowIso(),
      updatedBy: session.name,
    };
    this.uow.exitClearanceTemplates.update(item);
    this.uow.persist();
    return { ok: true as const, item };
  }

  deleteExitClearanceTemplate(session: UserSession, id: string) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const used = this.uow.exitClearanceForms
      .list()
      .some((f) => f.checklistItems.some((i) => i.templateItemId === id));
    if (used) {
      return {
        ok: false as const,
        error: "Template item is used in existing forms. Deactivate instead.",
        suggestDeactivate: true,
      };
    }
    this.uow.exitClearanceTemplates.delete(id);
    this.uow.persist();
    return { ok: true as const };
  }

  canAccessExitClearanceForm(session: UserSession, formId: string) {
    this.reload();
    const form = this.uow.exitClearanceForms.getById(formId);
    if (!form) return false;
    return canAccessExitForm(session, form);
  }

  getEmployeeSafeOffboardingCase(session: UserSession, caseId: string) {
    this.reload();
    return getEmployeeSafeOffboardingCase(this.uow, session, caseId);
  }

  getEmployeeOnboardingSummary(session: UserSession, caseId: string) {
    this.reload();
    return getEmployeeOnboardingSummary(this.uow, session, caseId);
  }

  confirmPersonalInformation(
    session: UserSession,
    taskId: string,
    patch: Parameters<typeof confirmPersonalInformation>[3]
  ) {
    this.reload();
    return confirmPersonalInformation(this.uow, session, taskId, patch);
  }

  savePersonalInformationDraft(
    session: UserSession,
    taskId: string,
    patch: Parameters<typeof savePersonalInformationDraft>[3]
  ) {
    this.reload();
    return savePersonalInformationDraft(this.uow, session, taskId, patch);
  }

  acknowledgeFirstDayInstructions(session: UserSession, taskId: string) {
    this.reload();
    return acknowledgeFirstDayInstructions(this.uow, session, taskId);
  }

  resetAliciaOnboardingJourney(session: UserSession) {
    this.reload();
    return resetAliciaOnboardingJourney(this.uow, session, () =>
      buildAliciaDemoPackage({
        checklistTemplates: this.uow.checklistTemplates.list(),
        assignmentRules: this.uow.assignmentRules.list(),
      })
    );
  }

  sendAliciaWelcomeEmail(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const employee = this.uow.employees.getById(ALICIA_EMPLOYEE_ID);
    if (!employee) return { ok: false as const, error: "Alicia not found." };
    const mail = buildAliciaWelcomeEmail(
      employee,
      ALICIA_INDUCTION_FORM_ID,
      ALICIA_ACCESS_CARD_FORM_ID
    );
    mail.id = uid("mail-alicia-welcome");
    this.uow.mockEmails.createMany([mail]);
    this.uow.activity.create({
      id: uid("act-welcome"),
      employeeId: employee.id,
      onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
      timestamp: nowIso(),
      actor: session.name,
      action: "Welcome email sent",
      detail: "Admin resent Alicia welcome email",
    });
    this.uow.persist();
    return { ok: true as const, emailId: mail.id };
  }

  markAliciaInternalTasksComplete(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const tasks = this.uow.tasks
      .list()
      .filter(
        (t) =>
          t.employeeId === ALICIA_EMPLOYEE_ID &&
          !t.isInductionEmployeeTask &&
          !t.isAccessCardEmployeeTask &&
          !t.isPersonalInfoReviewTask &&
          !t.isFirstDayAckTask &&
          t.status !== "Completed" &&
          t.status !== "Cancelled"
      );
    for (const t of tasks) {
      this.uow.tasks.update({
        ...t,
        status: "Completed",
        outcome: "Completed",
        completedAt: nowIso(),
        completedBy: session.email,
        completedByName: session.name,
        blocked: false,
        blockedReason: null,
      });
    }
    maybeMarkReadyForDayOne(this.uow, ALICIA_ONBOARDING_CASE_ID);
    this.uow.persist();
    return { ok: true as const, completed: tasks.length };
  }

  forceAliciaReadyForDayOne(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const tasks = this.uow.tasks
      .list()
      .filter(
        (t) =>
          t.employeeId === ALICIA_EMPLOYEE_ID &&
          t.status !== "Completed" &&
          t.status !== "Cancelled"
      );
    for (const t of tasks) {
      this.uow.tasks.update({
        ...t,
        status: "Completed",
        outcome:
          t.isFirstDayAckTask
            ? "Acknowledged"
            : t.isPersonalInfoReviewTask
              ? "Reviewed"
              : "Completed",
        completedAt: nowIso(),
        completedBy: session.email,
        completedByName: session.name,
        blocked: false,
        blockedReason: null,
      });
    }
    for (const f of this.uow.inductionForms
      .list()
      .filter((x) => x.employeeId === ALICIA_EMPLOYEE_ID)) {
      this.uow.inductionForms.update({
        ...f,
        formStatus: "Completed",
        updatedAt: nowIso(),
      });
    }
    for (const f of this.uow.accessCardForms
      .list()
      .filter((x) => x.employeeId === ALICIA_EMPLOYEE_ID)) {
      this.uow.accessCardForms.update({
        ...f,
        formStatus: "Completed",
        updatedAt: nowIso(),
      });
    }
    maybeMarkReadyForDayOne(this.uow, ALICIA_ONBOARDING_CASE_ID);
    this.uow.persist();
    return { ok: true as const };
  }

  repairAliciaOnboardingForms(session: UserSession) {
    this.reload();
    return repairAliciaOnboardingForms(this.uow, session);
  }

  repairAliciaOnboardingJourney(session: UserSession) {
    this.reload();
    return repairAliciaOnboardingJourney(this.uow, session);
  }

  ensureAliciaOnboardingDemoData(session?: UserSession | null) {
    this.reload();
    return ensureAliciaOnboardingDemoData(this.uow, session ?? null);
  }

  listMyForms(session: UserSession) {
    this.reload();
    const email = session.email.toLowerCase();
    const employee = this.uow.employees
      .list()
      .find((e) => e.email.toLowerCase() === email);
    const employeeId = employee?.id;
    const isLifecycleEmployee =
      session.role === "OFFBOARDING_EMPLOYEE" ||
      session.role === "ONBOARDING_EMPLOYEE";
    const forms: Array<{
      id: string;
      formName: string;
      kind: string;
      lifecycle: string;
      status: string;
      sentAt: string | null;
      dueDate: string | null;
      updatedAt: string;
      href: string;
      reviewer?: string | null;
      reviewStatus?: string;
    }> = [];

    for (const f of this.uow.exitClearanceForms.list()) {
      if (session.role === "ONBOARDING_EMPLOYEE") continue;
      if (
        session.role !== "Admin" &&
        session.role !== "HR" &&
        f.employeeEmail.toLowerCase() !== email &&
        f.employeeId !== employeeId
      ) {
        continue;
      }
      if (
        session.role === "OFFBOARDING_EMPLOYEE" &&
        f.employeeEmail.toLowerCase() !== email
      ) {
        continue;
      }
      forms.push({
        id: f.id,
        formName: "Employee Exit Clearance Form",
        kind: "Exit Clearance",
        lifecycle: "Offboarding",
        status: f.formStatus,
        sentAt: f.createdAt,
        dueDate: f.formDueDate,
        updatedAt: f.updatedAt,
        href: `/oneflow/exit-clearance/${f.id}`,
        reviewer: null,
        reviewStatus: f.formStatus,
      });
    }
    for (const f of this.uow.inductionForms.list()) {
      if (isLifecycleEmployee && f.employeeEmail.toLowerCase() !== email) {
        continue;
      }
      if (
        session.role !== "Admin" &&
        session.role !== "HR" &&
        !isLifecycleEmployee &&
        f.employeeEmail.toLowerCase() !== email
      ) {
        continue;
      }
      forms.push({
        id: f.id,
        formName: "Induction Checklist for New Employees",
        kind: "Induction Checklist",
        lifecycle: f.lifecycleType,
        status: f.formStatus,
        sentAt: f.createdAt,
        dueDate: f.formDueDate,
        updatedAt: f.updatedAt,
        href: `/oneflow/my-forms/induction/${f.id}`,
        reviewer: f.reviewedBy,
        reviewStatus: f.formStatus,
      });
    }
    for (const f of this.uow.accessCardForms.list()) {
      if (isLifecycleEmployee && f.employeeEmail.toLowerCase() !== email) {
        continue;
      }
      if (
        session.role !== "Admin" &&
        session.role !== "ADMINISTRATION" &&
        !isLifecycleEmployee &&
        f.employeeEmail.toLowerCase() !== email
      ) {
        continue;
      }
      forms.push({
        id: f.id,
        formName: "UOA Security Access Card Application",
        kind: "Access Card Application",
        lifecycle: f.lifecycleType,
        status: f.formStatus,
        sentAt: f.createdAt,
        dueDate: f.formDueDate,
        updatedAt: f.updatedAt,
        href: `/oneflow/my-forms/access-card/${f.id}`,
        reviewer: f.reviewedBy,
        reviewStatus: f.formStatus,
      });
    }
    return forms;
  }

  getInductionForm(id: string) {
    this.reload();
    const resolved = resolveAliciaInductionFormId(id);
    return (
      this.uow.inductionForms.getById(resolved) ||
      this.uow.inductionForms.getById(id) ||
      this.uow.inductionForms
        .list()
        .find(
          (f) =>
            f.id === id ||
            f.id === resolved ||
            (f.employeeId === ALICIA_EMPLOYEE_ID &&
              (id === ALICIA_INDUCTION_FORM_ID || resolved === ALICIA_INDUCTION_FORM_ID))
        )
    );
  }

  openInductionForm(session: UserSession, formId: string) {
    this.reload();
    const form = this.getInductionForm(formId);
    const canonicalId = form?.id || resolveAliciaInductionFormId(formId);
    return openInductionForm(this.uow, session, canonicalId);
  }

  saveInductionDraft(
    session: UserSession,
    formId: string,
    patch: Parameters<typeof saveInductionDraft>[3]
  ) {
    this.reload();
    return saveInductionDraft(this.uow, session, formId, patch);
  }

  submitInductionForm(
    session: UserSession,
    formId: string,
    patch?: Parameters<typeof saveInductionDraft>[3]
  ) {
    this.reload();
    const result = submitInductionForm(this.uow, session, formId, patch);
    if (result.ok) {
      const form = result.form;
      if (form.lifecycleType === "Onboarding") {
        maybeMarkReadyForDayOne(this.uow, form.lifecycleCaseId);
        this.uow.persist();
      }
    }
    return result;
  }

  reviewInductionForm(
    session: UserSession,
    formId: string,
    args: Parameters<typeof reviewInductionForm>[3]
  ) {
    this.reload();
    const result = reviewInductionForm(this.uow, session, formId, args);
    if (result.ok && result.form.lifecycleType === "Onboarding") {
      maybeMarkReadyForDayOne(this.uow, result.form.lifecycleCaseId);
      this.uow.persist();
    }
    return result;
  }

  assignInductionToDaniel(session: UserSession) {
    this.reload();
    return assignInductionToEmployee(this.uow, session, {
      employeeId: DANIEL_EMPLOYEE_ID,
      lifecycleCaseId: DANIEL_OFFBOARDING_CASE_ID,
      lifecycleType: "Offboarding",
      sendEmail: true,
    });
  }

  populateInductionDemo(session: UserSession, formId: string) {
    this.reload();
    return populateInductionDemo(this.uow, session, formId);
  }

  startInductionSession(session: UserSession, taskId: string) {
    this.reload();
    return startInductionSession(this.uow, session, taskId);
  }

  completeInductionSession(
    session: UserSession,
    taskId: string,
    args?: Parameters<typeof completeInductionSession>[3]
  ) {
    this.reload();
    return completeInductionSession(this.uow, session, taskId, args);
  }

  returnInductionSessionForReschedule(
    session: UserSession,
    taskId: string,
    reason: string
  ) {
    this.reload();
    return returnInductionSessionForReschedule(this.uow, session, taskId, reason);
  }

  repairAliciaInductionWorkflow(session: UserSession) {
    this.reload();
    return repairAliciaInductionWorkflow(this.uow, session);
  }

  resetAliciaInductionJourney(session: UserSession) {
    this.reload();
    return resetAliciaInductionJourney(this.uow, session);
  }

  populateAllInductionSessionsDemo(session: UserSession, formId: string) {
    this.reload();
    return populateAllInductionSessionsDemo(this.uow, session, formId);
  }

  getAccessCardForm(id: string) {
    this.reload();
    const resolved = resolveAliciaAccessCardFormId(id);
    return (
      this.uow.accessCardForms.getById(resolved) ||
      this.uow.accessCardForms.getById(id) ||
      this.uow.accessCardForms
        .list()
        .find(
          (f) =>
            f.id === id ||
            f.id === resolved ||
            (f.employeeId === ALICIA_EMPLOYEE_ID &&
              (id === ALICIA_ACCESS_CARD_FORM_ID ||
                resolved === ALICIA_ACCESS_CARD_FORM_ID))
        )
    );
  }

  openAccessCardForm(session: UserSession, formId: string) {
    this.reload();
    const form = this.getAccessCardForm(formId);
    const canonicalId = form?.id || resolveAliciaAccessCardFormId(formId);
    return openAccessCardForm(this.uow, session, canonicalId);
  }

  saveAccessCardDraft(
    session: UserSession,
    formId: string,
    patch: AccessCardEmployeePatch
  ) {
    this.reload();
    return saveAccessCardDraft(this.uow, session, formId, patch);
  }

  submitAccessCardForm(
    session: UserSession,
    formId: string,
    patch?: AccessCardEmployeePatch
  ) {
    this.reload();
    const result = submitAccessCardForm(this.uow, session, formId, patch);
    if (result.ok && result.form.lifecycleType === "Onboarding") {
      maybeMarkReadyForDayOne(this.uow, result.form.lifecycleCaseId);
      this.uow.persist();
    }
    return result;
  }

  reviewAccessCardForm(
    session: UserSession,
    formId: string,
    args: Parameters<typeof reviewAccessCardForm>[3]
  ) {
    this.reload();
    const result = reviewAccessCardForm(this.uow, session, formId, args);
    if (result.ok && result.form.lifecycleType === "Onboarding") {
      maybeMarkReadyForDayOne(this.uow, result.form.lifecycleCaseId);
      this.uow.persist();
    }
    return result;
  }

  assignAccessCardToDaniel(session: UserSession) {
    this.reload();
    return assignAccessCardToEmployee(this.uow, session, {
      employeeId: DANIEL_EMPLOYEE_ID,
      lifecycleCaseId: DANIEL_OFFBOARDING_CASE_ID,
      lifecycleType: "Offboarding",
      sendEmail: true,
    });
  }

  populateAccessCardDemo(session: UserSession, formId: string) {
    this.reload();
    return populateAccessCardDemo(this.uow, session, formId);
  }

  resetFormDemoJourneys(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    resetInductionFormsForEmployee(this.uow, DANIEL_EMPLOYEE_ID);
    resetAccessCardFormsForEmployee(this.uow, DANIEL_EMPLOYEE_ID);
    // Clear related emails for these forms
    const emails = this.uow.mockEmails
      .list()
      .filter(
        (e) =>
          !(
            e.employeeId === DANIEL_EMPLOYEE_ID &&
            (/Induction Checklist/i.test(e.subject) ||
              /Access Card/i.test(e.subject) ||
              /Security Access Card/i.test(e.subject))
          )
      );
    this.uow.mockEmails.replaceAll(emails);
    this.uow.activity.create({
      id: `act-reset-forms-${Date.now().toString(36)}`,
      employeeId: DANIEL_EMPLOYEE_ID,
      onboardingCaseId: "",
      offboardingCaseId: DANIEL_OFFBOARDING_CASE_ID,
      timestamp: nowIso(),
      actor: session.name,
      action: "Form demo journeys reset",
      detail: "Induction and Access Card demo forms cleared for Daniel",
    });
    this.uow.persist();
    return { ok: true as const };
  }

  assignOnboardingEmployeeForms(
    session: UserSession,
    employeeId: string,
    onboardingCaseId: string
  ) {
    this.reload();
    if (session.role !== "Admin" && session.role !== "HR") {
      return { ok: false as const, error: "Not authorized." };
    }
    const ind = assignInductionToEmployee(this.uow, session, {
      employeeId,
      lifecycleCaseId: onboardingCaseId,
      lifecycleType: "Onboarding",
      sendEmail: true,
    });
    const acc = assignAccessCardToEmployee(this.uow, session, {
      employeeId,
      lifecycleCaseId: onboardingCaseId,
      lifecycleType: "Onboarding",
      sendEmail: true,
    });
    return { ok: true as const, induction: ind, accessCard: acc };
  }

  getLaptopRequest(id: string) {
    this.reload();
    return getLaptopRequest(this.uow, id);
  }

  getLaptopRequestByCase(caseId: string) {
    this.reload();
    return getLaptopRequestByCase(this.uow, caseId);
  }

  /** Employee-facing safe laptop status only — no financial fields. */
  getEmployeeSafeLaptopStatus(caseId: string) {
    this.reload();
    return getEmployeeSafeLaptopStatus(this.uow, caseId);
  }

  submitLaptopNotRequired(
    session: UserSession,
    requestId: string,
    args: { reason: string; remarks?: string }
  ) {
    this.reload();
    return submitLaptopNotRequired(this.uow, session, requestId, args);
  }

  submitLaptopRequired(
    session: UserSession,
    requestId: string,
    args: Parameters<typeof submitLaptopRequired>[3]
  ) {
    this.reload();
    return submitLaptopRequired(this.uow, session, requestId, args);
  }

  saveLaptopProcurementDraft(
    session: UserSession,
    requestId: string,
    patch: Parameters<typeof saveProcurementDraft>[3]
  ) {
    this.reload();
    return saveProcurementDraft(this.uow, session, requestId, patch);
  }

  confirmLaptopPurchaseOrder(
    session: UserSession,
    requestId: string,
    patch: Parameters<typeof confirmPurchaseOrder>[3]
  ) {
    this.reload();
    return confirmPurchaseOrder(this.uow, session, requestId, patch);
  }

  returnLaptopRequestToManager(
    session: UserSession,
    requestId: string,
    reason: string
  ) {
    this.reload();
    return returnLaptopRequestToManager(this.uow, session, requestId, reason);
  }

  updateLaptopEquipmentStatus(
    session: UserSession,
    requestId: string,
    status: Parameters<typeof updateEquipmentPreparationStatus>[3]
  ) {
    this.reload();
    return updateEquipmentPreparationStatus(
      this.uow,
      session,
      requestId,
      status
    );
  }

  resetDemoLaptopRequest(session: UserSession) {
    this.reload();
    return resetDemoLaptopRequest(this.uow, session);
  }

  submitDemoLaptopRequest(session: UserSession) {
    this.reload();
    return submitDemoLaptopRequest(this.uow, session);
  }

  populateDemoLaptopPO(session: UserSession) {
    this.reload();
    return populateDemoPO(this.uow, session);
  }

  confirmDemoLaptopPO(session: UserSession) {
    this.reload();
    const req = getLaptopRequestByCase(this.uow, ALICIA_ONBOARDING_CASE_ID);
    if (!req) return { ok: false as const, error: "Request not found." };
    const employee = this.uow.employees.getById(req.employeeId);
    const est =
      req.estimatedDeliveryDate ||
      (employee
        ? // fallback
          new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10));
    populateDemoPO(this.uow, session);
    const refreshed = getLaptopRequest(this.uow, req.id)!;
    return confirmPurchaseOrder(this.uow, session, req.id, {
      vendorName: refreshed.vendorName || LAPTOP_DEMO.vendorName,
      quotationReference:
        refreshed.quotationReference || LAPTOP_DEMO.quotationReference,
      purchaseOrderNumber:
        refreshed.purchaseOrderNumber || LAPTOP_DEMO.purchaseOrderNumber,
      purchaseOrderDate:
        refreshed.purchaseOrderDate || new Date().toISOString().slice(0, 10),
      estimatedDeliveryDate: refreshed.estimatedDeliveryDate || est,
      procurementRemarks: refreshed.procurementRemarks || "Demo PO confirmed",
    });
  }

  cancelLaptopRequest(session: UserSession, requestId: string, reason: string) {
    this.reload();
    return cancelLaptopRequest(this.uow, session, requestId, reason);
  }

  simulateMissingLaptopCredit(session: UserSession) {
    this.reload();
    return simulateMissingCreditNumber(this.uow, session);
  }

  simulateLaptopManagerDelay(session: UserSession) {
    this.reload();
    return simulateManagerDelay(this.uow, session);
  }

  advanceDemoLaptopTime(session: UserSession) {
    this.reload();
    return advanceDemoLaptopTime(this.uow, session);
  }

  sendLaptopDecisionEmail(session: UserSession) {
    this.reload();
    if (session.role !== "Admin") {
      return { ok: false as const, error: "Admin only." };
    }
    const reset = resetDemoLaptopRequest(this.uow, session);
    if (!reset.ok) return reset;
    return { ok: true as const, message: "Laptop decision email sent." };
  }
}

let singleton: AppDataService | null = null;

export function getDataService(): DataService {
  if (typeof window === "undefined") {
    return new AppDataService();
  }
  if (!singleton) singleton = new AppDataService();
  return singleton;
}

/** @deprecated use getDataService — kept for import compatibility */
export { LocalStorageRepository as LocalStorageDataService };
export { STORAGE_KEY } from "./repositories/local-storage-repository";
