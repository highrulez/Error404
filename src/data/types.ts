/** Domain models — designed for future Dataverse entity mapping. */

export type EmploymentStatus =
  | "Pre-Hire"
  | "Preboarding"
  | "New Hire"
  | "Active"
  | "Offboarding"
  | "Terminated";

export type EmployeeType = "Permanent" | "Contract" | "Intern";

export type ChecklistGroup =
  | "HR Checklist"
  | "IT Checklist"
  | "Facilities Checklist"
  | "Hiring Manager Checklist"
  | "Finance Checklist";

export type ResponsibleTeam =
  | "HR Operations"
  | "IT Security"
  | "Onsite IT Support"
  | "Facilities / Building Management"
  | "Hiring Manager"
  | "Finance / Administration"
  | "Corporate Card Admin"
  | "Administration"
  | "Quality"
  | "Product Stewardship";

/** Payload group label for Facilities (short form). */
export type PayloadResponsibleTeam =
  | "HR Operations"
  | "IT Security"
  | "Onsite IT Support"
  | "Facilities"
  | "Hiring Manager"
  | "Finance / Administration"
  | "Corporate Card Admin"
  | "Administration"
  | "Quality"
  | "Product Stewardship";

export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Overdue"
  | "Blocked"
  | "Cancelled";

export type OnboardingCaseStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "On Hold";

export type NotificationStatus =
  | "Not Sent"
  | "Pending"
  | "Sent"
  | "Failed"
  | "Simulated";

export type EscalationStatus = "None" | "Reminder Sent" | "Escalated";

export type ReminderStatus =
  | "Not Required"
  | "Scheduled"
  | "Reminder Sent"
  | "Escalated"
  | "Stopped";

export type AutomationMode = "simulation" | "live";

export type SourceSystem = "PeopleHub" | "OneFlow" | "Dataverse" | "Power Automate";

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  location: string;
  managerName: string;
  managerEmail: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  startDate: string;
  /** When true, employee appears in OneFlow as a new-hire candidate. */
  requiresOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
  /** Offboarding fields */
  lastWorkingDate?: string | null;
  terminationType?: import("./offboarding-types").TerminationType | null;
  terminationReason?: string | null;
  immediateAccessRemovalRequired?: boolean;
  offboardingStatus?: import("./offboarding-types").OffboardingCaseStatus | null;
  /** Employee-editable contact fields (onboarding personal info task) */
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}

export interface OnboardingCase {
  id: string;
  caseNumber: string;
  employeeId: string;
  status: OnboardingCaseStatus;
  overallProgress: number;
  createdAt: string;
  updatedAt: string;
  lastWorkflowTriggeredAt?: string | null;
  lastWorkflowError?: string | null;
  /** True after Account Created email was sent to Onsite IT Support. */
  accountCreatedEmailSent?: boolean;
  accountCreatedEmailSentAt?: string | null;
  accountCreatedEmailId?: string | null;
}

export interface ChecklistTask {
  id: string;
  employeeId: string;
  onboardingCaseId: string;
  group: ChecklistGroup;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "Low" | "Medium" | "High" | "Critical";
  /** @deprecated prefer assignedPersonName */
  assignedOwner: string;
  responsibleTeam: ResponsibleTeam;
  assignedPersonName: string;
  assignedEmail: string;
  dueDate: string;
  completedAt: string | null;
  notes: string;
  notificationStatus: NotificationStatus;
  notificationSentAt: string | null;
  reminderCount: number;
  /** @deprecated prefer lastReminderSentAt */
  lastReminderAt: string | null;
  escalationStatus: EscalationStatus;
  sourceSystem: SourceSystem;
  /** IDs of tasks that must be Completed before this task can start. */
  dependencyTaskIds: string[];
  blockedReason: string | null;
  unlockedAt: string | null;
  /** Snapshot fields from checklist template at case creation. */
  required?: boolean;
  sortOrder?: number;
  templateTaskId?: string | null;
  /** Onboarding or Offboarding lifecycle */
  processType?: import("./offboarding-types").LifecycleProcess;
  /** Set for offboarding tasks (onboarding uses onboardingCaseId). */
  offboardingCaseId?: string | null;
  /** Scheduled access-removal fields */
  executionDateTime?: string | null;
  executionMode?: import("./offboarding-types").ExecutionMode | null;
  executionStatus?: import("./offboarding-types").ExecutionStatus | null;
  securityCritical?: boolean;
  /** Reminder configuration snapshot + runtime state */
  reminderEnabled?: boolean;
  firstReminderAfterWorkingDays?: number;
  reminderFrequencyWorkingDays?: number;
  maximumReminderCount?: number;
  escalationAfterWorkingDays?: number;
  escalationEmailRule?: import("./template-types").EscalationEmailRule;
  fixedEscalationEmail?: string;
  assignedAt?: string | null;
  firstReminderDueAt?: string | null;
  nextReminderDueAt?: string | null;
  lastReminderSentAt?: string | null;
  escalationDueAt?: string | null;
  escalatedAt?: string | null;
  reminderStatus?: ReminderStatus;
  /** Employee Exit Clearance Form linkage */
  exitFormId?: string | null;
  exitFormItemId?: string | null;
  isExitClearanceEmployeeTask?: boolean;
  isExitClearanceConfirmation?: boolean;
  /** Induction / Access Card form linkage */
  linkedInductionFormId?: string | null;
  linkedAccessCardFormId?: string | null;
  /** Explicit form linkage for My Forms / inbox routing */
  relatedFormType?: string | null;
  relatedFormId?: string | null;
  relatedSectionId?: string | null;
  isInductionEmployeeTask?: boolean;
  isInductionReviewTask?: boolean;
  isInductionPresenterTask?: boolean;
  isAccessCardEmployeeTask?: boolean;
  isAccessCardReviewTask?: boolean;
  isPersonalInfoReviewTask?: boolean;
  isFirstDayAckTask?: boolean;
  isLaptopDecisionTask?: boolean;
  isLaptopProcurementTask?: boolean;
  isLaptopPrepareTask?: boolean;
  linkedLaptopRequestId?: string | null;
  /** Unified Task Center fields */
  taskType?: import("./unified-task-types").UnifiedTaskType;
  outcome?: import("./unified-task-types").UnifiedTaskOutcome;
  instructions?: string;
  lifecycleCaseId?: string | null;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  responsibleRole?: string;
  assignedUserId?: string | null;
  assignedUserName?: string;
  assignedTeam?: string;
  startedAt?: string | null;
  completedBy?: string | null;
  completedByName?: string | null;
  remarks?: string;
  blocked?: boolean;
  sourceType?: import("./unified-task-types").UnifiedSourceType;
  sourceRecordId?: string | null;
  linkedExitClearanceFormId?: string | null;
  linkedChecklistItemId?: string | null;
}

export interface ActivityHistory {
  id: string;
  employeeId: string;
  onboardingCaseId: string;
  offboardingCaseId?: string | null;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
}

export interface AssignmentRule {
  id: string;
  responsibleTeam: ResponsibleTeam;
  checklistGroup: ChecklistGroup;
  taskName: string;
  location: string;
  department: string;
  assignedEmail: string;
  assignedPersonName: string;
  active: boolean;
}

export interface AppSettings {
  automationMode: AutomationMode;
}

export interface AppStore {
  employees: Employee[];
  onboardingCases: OnboardingCase[];
  offboardingCases: import("./offboarding-types").OffboardingCase[];
  tasks: ChecklistTask[];
  activity: ActivityHistory[];
  assignmentRules: AssignmentRule[];
  checklistTemplates: import("./template-types").ChecklistTemplateTask[];
  checklistTemplateAudits: import("./template-types").ChecklistTemplateAudit[];
  mockEmails: import("./auth-types").MockEmail[];
  automationRuns: import("./auth-types").AutomationRun[];
  exitClearanceForms: import("./exit-clearance-types").EmployeeExitClearanceForm[];
  exitClearanceTemplates: import("./exit-clearance-types").ExitClearanceTemplateItem[];
  inductionForms: import("./induction-types").InductionChecklistForm[];
  accessCardForms: import("./access-card-types").SecurityAccessCardApplication[];
  laptopRequests: import("./laptop-request-types").LaptopRequest[];
  settings: AppSettings;
  version: number;
}

export interface GroupProgress {
  group: ChecklistGroup;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  percent: number;
}

export interface CaseProgressSummary {
  overallProgress: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  inProgressCount: number;
  blockedCount: number;
  byGroup: GroupProgress[];
}

export interface CreateEmployeeInput
  extends Omit<
    Employee,
    "id" | "createdAt" | "updatedAt" | "requiresOnboarding" | "employeeNumber"
  > {
  employeeNumber?: string;
}

/**
 * Facade used by the UI. Backed by repository interfaces (localStorage today,
 * Dataverse later) — never call localStorage from components.
 */
export interface DataService {
  getStore(): AppStore;
  listEmployees(): Employee[];
  getEmployee(id: string): Employee | undefined;
  createEmployee(input: CreateEmployeeInput): {
    employee: Employee;
    caseCreated: boolean;
  };
  updateEmployee(
    id: string,
    patch: Partial<Omit<Employee, "id" | "createdAt" | "employeeNumber">>
  ): { employee: Employee; caseCreated: boolean };
  listNewHires(): Employee[];
  listOnboardingCases(): OnboardingCase[];
  getOnboardingCase(id: string): OnboardingCase | undefined;
  getCaseByEmployee(employeeId: string): OnboardingCase | undefined;
  listTasksForCase(caseId: string): ChecklistTask[];
  listTasksByAssigneeEmail(email: string): ChecklistTask[];
  getTask(id: string): ChecklistTask | undefined;
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    actor?: string
  ):
    | { task: ChecklistTask; accountCreatedNotice?: string }
    | undefined;
  updateTaskNotes(
    taskId: string,
    notes: string,
    actor?: string
  ): ChecklistTask | undefined;
  getActivityForCase(caseId: string): ActivityHistory[];
  getCaseProgress(caseId: string): CaseProgressSummary;
  getDashboardStats(): {
    newHires: number;
    openCases: number;
    completedTasks: number;
    overdueTasks: number;
    avgProgress: number;
  };
  listAssignmentRules(): AssignmentRule[];
  getSettings(): AppSettings;
  setAutomationMode(mode: AutomationMode): void;
  retryFailedNotification(
    caseId: string,
    responsibleTeam?: ResponsibleTeam
  ): Promise<{ ok: boolean; message: string }>;
  simulateReminder(caseId: string): Promise<{ ok: boolean; message: string }>;
  triggerNewHireWorkflow(
    caseId: string
  ): Promise<{ ok: boolean; message: string }>;
  /** Auth-aware task update — enforces role permissions. */
  updateTaskStatusAsUser(
    session: import("./auth-types").UserSession,
    taskId: string,
    status: TaskStatus
  ):
    | { ok: true; task: ChecklistTask; notice?: string }
    | { ok: false; error: string };
  updateTaskNotesAsUser(
    session: import("./auth-types").UserSession,
    taskId: string,
    notes: string
  ): { ok: true; task: ChecklistTask } | { ok: false; error: string };
  listTasksForUser(
    session: import("./auth-types").UserSession
  ): ChecklistTask[];
  /** Unified Task Center workflow dispatcher */
  executeTaskWorkflow(input: {
    taskId: string;
    actingUserId: string;
    session: import("./auth-types").UserSession;
    action:
      | "Start"
      | "Complete"
      | "Approve"
      | "Reject"
      | "Confirm"
      | "Return for Correction"
      | "Start Review"
      | "Complete Review"
      | "Acknowledge"
      | "Admin Override Confirmation";
    remarks?: string;
    initials?: string;
    outcome?: import("./unified-task-types").UnifiedTaskOutcome;
    overrideReason?: string;
  }):
    | { ok: true; task: ChecklistTask; notice?: string }
    | { ok: false; error: string };
  getTaskForUser(
    session: import("./auth-types").UserSession,
    taskId: string
  ):
    | { ok: true; task: ChecklistTask; notice?: string }
    | { ok: false; error: string };
  repairExitConfirmationLinks(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        repairedItems: number;
        createdTasks: number;
        warnings: number;
      }
    | { ok: false; error: string };
  listEmailsForUser(
    session: import("./auth-types").UserSession
  ): import("./auth-types").MockEmail[];
  listAutomationRuns(): import("./auth-types").AutomationRun[];
  getAutomationRun(
    id: string
  ): import("./auth-types").AutomationRun | undefined;
  runMockAutomation(
    caseId: string,
    options?: { simulateFailure?: boolean }
  ): Promise<{ ok: boolean; message: string; runId?: string }>;
  retryAutomationRun(
    runId: string
  ): Promise<{ ok: boolean; message: string; runId?: string }>;
  markEmailRead(emailId: string, read: boolean): void;
  deleteEmail(emailId: string): void;
  resetDemoEmails(): void;
  resetToSeed(options?: {
    resetTemplates?: boolean;
    preserveCases?: boolean;
  }): AppStore;
  resendAccountCreatedEmail(
    caseId: string,
    actor: string
  ): { ok: boolean; message: string; emailId?: string };
  getAccountCreatedEmail(
    caseId: string
  ): import("./auth-types").MockEmail | undefined;
  listChecklistTemplates(): import("./template-types").ChecklistTemplateTask[];
  listChecklistTemplateAudits(): import("./template-types").ChecklistTemplateAudit[];
  getChecklistTemplate(
    id: string
  ): import("./template-types").ChecklistTemplateTask | undefined;
  previewOnboardingChecklist(): import("./template-types").ChecklistTemplateTask[];
  createChecklistTemplate(
    session: import("./auth-types").UserSession,
    input: import("./template-types").ChecklistTemplateTaskInput
  ):
    | { ok: true; task: import("./template-types").ChecklistTemplateTask }
    | { ok: false; error: string };
  updateChecklistTemplate(
    session: import("./auth-types").UserSession,
    id: string,
    input: import("./template-types").ChecklistTemplateTaskInput
  ):
    | { ok: true; task: import("./template-types").ChecklistTemplateTask }
    | { ok: false; error: string };
  duplicateChecklistTemplate(
    session: import("./auth-types").UserSession,
    id: string
  ):
    | { ok: true; task: import("./template-types").ChecklistTemplateTask }
    | { ok: false; error: string };
  reorderChecklistTemplate(
    session: import("./auth-types").UserSession,
    id: string,
    sortOrder: number
  ):
    | { ok: true; task: import("./template-types").ChecklistTemplateTask }
    | { ok: false; error: string };
  setChecklistTemplateActive(
    session: import("./auth-types").UserSession,
    id: string,
    active: boolean
  ):
    | { ok: true; task: import("./template-types").ChecklistTemplateTask }
    | { ok: false; error: string };
  deleteChecklistTemplate(
    session: import("./auth-types").UserSession,
    id: string
  ): { ok: true } | { ok: false; error: string; suggestDeactivate?: boolean };
  isTemplateTaskUsedInCases(templateTaskId: string): boolean;
  runReminderCheck(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        message: string;
        summary: {
          tasksChecked: number;
          remindersGenerated: number;
          overdueNotificationsGenerated: number;
          escalationsGenerated: number;
          runId: string;
        };
      }
    | { ok: false; error: string };
  sendTaskReminderNow(
    session: import("./auth-types").UserSession,
    taskId: string
  ): { ok: true; message: string } | { ok: false; error: string };
  rescheduleTaskReminder(
    session: import("./auth-types").UserSession,
    taskId: string,
    nextReminderDueAt: string
  ):
    | { ok: true; message: string; task: ChecklistTask }
    | { ok: false; error: string };
  stopTaskReminders(
    session: import("./auth-types").UserSession,
    taskId: string
  ):
    | { ok: true; message: string; task: ChecklistTask }
    | { ok: false; error: string };
  resendTaskEscalation(
    session: import("./auth-types").UserSession,
    taskId: string
  ): { ok: true; message: string } | { ok: false; error: string };
  listOffboardingCases(): import("./offboarding-types").OffboardingCase[];
  getOffboardingCase(
    id: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  getOffboardingCaseByEmployee(
    employeeId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  listTasksForOffboardingCase(caseId: string): ChecklistTask[];
  getOffboardingProgress(caseId: string): CaseProgressSummary;
  listActivityForOffboardingCase(caseId: string): ActivityHistory[];
  listEmailsForOffboardingCase(
    caseId: string
  ): import("./auth-types").MockEmail[];
  getOffboardingDashboardStats(): {
    activeCases: number;
    upcomingDepartures: number;
    assetsAwaitingReturn: number;
    accessRemovalPending: number;
    criticalRisk: number;
    avgProgress: number;
  };
  createSampleOffboardingCase(): {
    employee: Employee;
    offboardingCase: import("./offboarding-types").OffboardingCase;
  };
  advanceToLastWorkingDay(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  simulateAssetReturn(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  simulateAccessRemoval(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  simulateMissingLaptop(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  simulateAccessStillActive(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  completeOffboarding(
    caseId: string
  ): import("./offboarding-types").OffboardingCase | undefined;
  previewOffboardingChecklist(): import("./template-types").ChecklistTemplateTask[];
  getExitClearanceForm(
    id: string
  ): import("./exit-clearance-types").EmployeeExitClearanceForm | undefined;
  getExitClearanceFormByCase(
    caseId: string
  ): import("./exit-clearance-types").EmployeeExitClearanceForm | undefined;
  getExitClearanceFormForEmployee(
    employeeId: string
  ): import("./exit-clearance-types").EmployeeExitClearanceForm | undefined;
  listExitClearanceForms(): import("./exit-clearance-types").EmployeeExitClearanceForm[];
  getExitFormProgress(formId: string): {
    employeeSubmission: "Not Started" | "In Progress" | "Submitted";
    requiredConfirmations: number;
    confirmedCount: number;
    clearedCount?: number;
    percent: number;
    pendingDepartments: string[];
    correctionItems: number;
    rejectedItems: number;
  };
  openExitClearanceForm(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  saveExitClearanceDraft(
    session: import("./auth-types").UserSession,
    formId: string,
    patch: import("./exit-clearance-ops").ExitFormEmployeePatch
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  submitExitClearanceForm(
    session: import("./auth-types").UserSession,
    formId: string,
    patch: import("./exit-clearance-ops").ExitFormEmployeePatch
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  confirmExitClearanceItem(
    session: import("./auth-types").UserSession,
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
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  populateSampleExitAnswers(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  resetDanielExitFormJourney(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
        offboardingCase: import("./offboarding-types").OffboardingCase;
      }
    | { ok: false; error: string };
  confirmAllExitConfirmations(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
      }
    | { ok: false; error: string };
  adminSendExitFormEmail(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./exit-clearance-types").EmployeeExitClearanceForm;
        emailId: string;
      }
    | { ok: false; error: string };
  listExitClearanceTemplates(): import("./exit-clearance-types").ExitClearanceTemplateItem[];
  createExitClearanceTemplate(
    session: import("./auth-types").UserSession,
    input: import("./exit-clearance-types").ExitClearanceTemplateItemInput
  ):
    | {
        ok: true;
        item: import("./exit-clearance-types").ExitClearanceTemplateItem;
      }
    | { ok: false; error: string };
  updateExitClearanceTemplate(
    session: import("./auth-types").UserSession,
    id: string,
    input: import("./exit-clearance-types").ExitClearanceTemplateItemInput
  ):
    | {
        ok: true;
        item: import("./exit-clearance-types").ExitClearanceTemplateItem;
      }
    | { ok: false; error: string };
  setExitClearanceTemplateActive(
    session: import("./auth-types").UserSession,
    id: string,
    active: boolean
  ):
    | {
        ok: true;
        item: import("./exit-clearance-types").ExitClearanceTemplateItem;
      }
    | { ok: false; error: string };
  deleteExitClearanceTemplate(
    session: import("./auth-types").UserSession,
    id: string
  ):
    | { ok: true }
    | { ok: false; error: string; suggestDeactivate?: boolean };
  canAccessExitClearanceForm(
    session: import("./auth-types").UserSession,
    formId: string
  ): boolean;
  getEmployeeSafeOffboardingCase(
    session: import("./auth-types").UserSession,
    caseId: string
  ):
    | {
        ok: true;
        data: import("./employee-safe-types").EmployeeSafeOffboardingCase;
      }
    | { ok: false; error: string; redirectCaseId?: string };
  getEmployeeOnboardingSummary(
    session: import("./auth-types").UserSession,
    caseId: string
  ):
    | {
        ok: true;
        data: import("./employee-lifecycle-types").EmployeeLifecycleSummary;
      }
    | { ok: false; error: string; redirectCaseId?: string };
  confirmPersonalInformation(
    session: import("./auth-types").UserSession,
    taskId: string,
    patch: {
      preferredName?: string;
      personalEmail?: string;
      phone?: string;
      emergencyContactName?: string;
      emergencyContactNumber?: string;
    }
  ): { ok: true; employee: Employee } | { ok: false; error: string };
  savePersonalInformationDraft(
    session: import("./auth-types").UserSession,
    taskId: string,
    patch: {
      preferredName?: string;
      personalEmail?: string;
      phone?: string;
      emergencyContactName?: string;
      emergencyContactNumber?: string;
    }
  ): { ok: true } | { ok: false; error: string };
  acknowledgeFirstDayInstructions(
    session: import("./auth-types").UserSession,
    taskId: string
  ): { ok: true } | { ok: false; error: string };
  resetAliciaOnboardingJourney(
    session: import("./auth-types").UserSession
  ): { ok: true; caseId: string } | { ok: false; error: string };
  sendAliciaWelcomeEmail(
    session: import("./auth-types").UserSession
  ): { ok: true; emailId: string } | { ok: false; error: string };
  markAliciaInternalTasksComplete(
    session: import("./auth-types").UserSession
  ): { ok: true; completed: number } | { ok: false; error: string };
  forceAliciaReadyForDayOne(
    session: import("./auth-types").UserSession
  ): { ok: true } | { ok: false; error: string };
  repairAliciaOnboardingForms(
    session: import("./auth-types").UserSession
  ): { ok: true; message: string } | { ok: false; error: string };
  repairAliciaOnboardingJourney(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        message: string;
        report: {
          ok: true;
          messages: string[];
          warnings: string[];
        };
      }
    | { ok: false; error: string };
  ensureAliciaOnboardingDemoData(
    session?: import("./auth-types").UserSession | null
  ): {
    ok: true;
    messages: string[];
    warnings: string[];
  };
  getLaptopRequest(
    id: string
  ): import("./laptop-request-types").LaptopRequest | undefined;
  getLaptopRequestByCase(
    caseId: string
  ): import("./laptop-request-types").LaptopRequest | undefined;
  getEmployeeSafeLaptopStatus(caseId: string): {
    status: import("./laptop-request-types").EmployeeSafeEquipmentStatus;
    estimatedReadiness: string | null;
    requestId: string | null;
  };
  submitLaptopNotRequired(
    session: import("./auth-types").UserSession,
    requestId: string,
    args: { reason: string; remarks?: string }
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  submitLaptopRequired(
    session: import("./auth-types").UserSession,
    requestId: string,
    args: unknown
  ):
    | {
        ok: true;
        request: import("./laptop-request-types").LaptopRequest;
        procurementTaskId: string;
      }
    | { ok: false; error: string };
  saveLaptopProcurementDraft(
    session: import("./auth-types").UserSession,
    requestId: string,
    patch: unknown
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  confirmLaptopPurchaseOrder(
    session: import("./auth-types").UserSession,
    requestId: string,
    patch: unknown
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  returnLaptopRequestToManager(
    session: import("./auth-types").UserSession,
    requestId: string,
    reason: string
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  updateLaptopEquipmentStatus(
    session: import("./auth-types").UserSession,
    requestId: string,
    status: string
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  resetDemoLaptopRequest(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  submitDemoLaptopRequest(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        request: import("./laptop-request-types").LaptopRequest;
        procurementTaskId?: string;
      }
    | { ok: false; error: string };
  populateDemoLaptopPO(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  confirmDemoLaptopPO(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  cancelLaptopRequest(
    session: import("./auth-types").UserSession,
    requestId: string,
    reason: string
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  simulateMissingLaptopCredit(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        request: import("./laptop-request-types").LaptopRequest;
        procurementTaskId?: string;
      }
    | { ok: false; error: string };
  simulateLaptopManagerDelay(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  advanceDemoLaptopTime(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; request: import("./laptop-request-types").LaptopRequest }
    | { ok: false; error: string };
  sendLaptopDecisionEmail(
    session: import("./auth-types").UserSession
  ): { ok: true; message: string } | { ok: false; error: string };
  listMyForms(session: import("./auth-types").UserSession): Array<{
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
  }>;
  getInductionForm(
    id: string
  ): import("./induction-types").InductionChecklistForm | undefined;
  openInductionForm(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  saveInductionDraft(
    session: import("./auth-types").UserSession,
    formId: string,
    patch: unknown
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  submitInductionForm(
    session: import("./auth-types").UserSession,
    formId: string,
    patch?: unknown
  ):
    | {
        ok: true;
        form: import("./induction-types").InductionChecklistForm;
        reviewTaskId?: string;
      }
    | { ok: false; error: string };
  reviewInductionForm(
    session: import("./auth-types").UserSession,
    formId: string,
    args: unknown
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  assignInductionToDaniel(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        form: import("./induction-types").InductionChecklistForm;
        created?: boolean;
      }
    | { ok: false; error: string };
  populateInductionDemo(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  startInductionSession(
    session: import("./auth-types").UserSession,
    taskId: string
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  completeInductionSession(
    session: import("./auth-types").UserSession,
    taskId: string,
    args?: {
      completedOn?: string;
      remarks?: string;
      pastDateReason?: string;
      itemCoverage?: Record<
        string,
        "Covered" | "Not Applicable" | "Follow-up Required"
      >;
    }
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  returnInductionSessionForReschedule(
    session: import("./auth-types").UserSession,
    taskId: string,
    reason: string
  ): { ok: true } | { ok: false; error: string };
  repairAliciaInductionWorkflow(
    session: import("./auth-types").UserSession
  ):
    | { ok: true; message: string; messages: string[] }
    | { ok: false; error: string };
  resetAliciaInductionJourney(
    session: import("./auth-types").UserSession
  ): { ok: true; message: string } | { ok: false; error: string };
  populateAllInductionSessionsDemo(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | { ok: true; form: import("./induction-types").InductionChecklistForm }
    | { ok: false; error: string };
  getAccessCardForm(
    id: string
  ): import("./access-card-types").SecurityAccessCardApplication | undefined;
  openAccessCardForm(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
      }
    | { ok: false; error: string };
  saveAccessCardDraft(
    session: import("./auth-types").UserSession,
    formId: string,
    patch: unknown
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
      }
    | { ok: false; error: string };
  submitAccessCardForm(
    session: import("./auth-types").UserSession,
    formId: string,
    patch?: unknown
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
        reviewTaskId?: string;
      }
    | { ok: false; error: string };
  reviewAccessCardForm(
    session: import("./auth-types").UserSession,
    formId: string,
    args: unknown
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
      }
    | { ok: false; error: string };
  assignAccessCardToDaniel(
    session: import("./auth-types").UserSession
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
        created?: boolean;
      }
    | { ok: false; error: string };
  populateAccessCardDemo(
    session: import("./auth-types").UserSession,
    formId: string
  ):
    | {
        ok: true;
        form: import("./access-card-types").SecurityAccessCardApplication;
      }
    | { ok: false; error: string };
  resetFormDemoJourneys(
    session: import("./auth-types").UserSession
  ): { ok: true } | { ok: false; error: string };
}
