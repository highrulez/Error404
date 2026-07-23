import type {
  ActivityHistory,
  AssignmentRule,
  ChecklistTask,
  Employee,
  OnboardingCase,
  ResponsibleTeam,
  TaskStatus,
} from "../types";
import type { AutomationRun, MockEmail } from "../auth-types";
import type {
  ChecklistTemplateAudit,
  ChecklistTemplateTask,
} from "../template-types";
import type { OffboardingCase } from "../offboarding-types";
import type {
  EmployeeExitClearanceForm,
  ExitClearanceTemplateItem,
} from "../exit-clearance-types";

export interface EmployeeRepository {
  list(): Employee[];
  getById(id: string): Employee | undefined;
  create(employee: Employee): Employee;
  update(employee: Employee): Employee;
  replaceAll(employees: Employee[]): void;
}

export interface OnboardingCaseRepository {
  list(): OnboardingCase[];
  getById(id: string): OnboardingCase | undefined;
  getByEmployeeId(employeeId: string): OnboardingCase | undefined;
  create(onboardingCase: OnboardingCase): OnboardingCase;
  update(onboardingCase: OnboardingCase): OnboardingCase;
  replaceAll(cases: OnboardingCase[]): void;
}

export interface ChecklistTaskRepository {
  list(): ChecklistTask[];
  getById(id: string): ChecklistTask | undefined;
  listByCaseId(caseId: string): ChecklistTask[];
  listByAssigneeEmail(email: string): ChecklistTask[];
  listByResponsibleTeam(team: ResponsibleTeam): ChecklistTask[];
  createMany(tasks: ChecklistTask[]): ChecklistTask[];
  update(task: ChecklistTask): ChecklistTask;
  updateMany(tasks: ChecklistTask[]): void;
  replaceAll(tasks: ChecklistTask[]): void;
}

export interface ActivityRepository {
  list(): ActivityHistory[];
  listByCaseId(caseId: string): ActivityHistory[];
  create(entry: ActivityHistory): ActivityHistory;
  replaceAll(entries: ActivityHistory[]): void;
}

export interface AssignmentRuleRepository {
  list(): AssignmentRule[];
  getById(id: string): AssignmentRule | undefined;
  listActive(): AssignmentRule[];
  replaceAll(rules: AssignmentRule[]): void;
}

export interface MockEmailRepository {
  list(): MockEmail[];
  getById(id: string): MockEmail | undefined;
  createMany(emails: MockEmail[]): void;
  update(email: MockEmail): void;
  replaceAll(emails: MockEmail[]): void;
}

export interface AutomationRunRepository {
  list(): AutomationRun[];
  getById(id: string): AutomationRun | undefined;
  create(run: AutomationRun): void;
  update(run: AutomationRun): void;
  replaceAll(runs: AutomationRun[]): void;
}

export interface OffboardingCaseRepository {
  list(): OffboardingCase[];
  getById(id: string): OffboardingCase | undefined;
  getByEmployeeId(employeeId: string): OffboardingCase | undefined;
  create(offboardingCase: OffboardingCase): OffboardingCase;
  update(offboardingCase: OffboardingCase): OffboardingCase;
  replaceAll(cases: OffboardingCase[]): void;
}

export interface ChecklistTemplateRepository {
  list(): ChecklistTemplateTask[];
  listActive(): ChecklistTemplateTask[];
  getById(id: string): ChecklistTemplateTask | undefined;
  create(task: ChecklistTemplateTask): ChecklistTemplateTask;
  update(task: ChecklistTemplateTask): ChecklistTemplateTask;
  delete(id: string): void;
  replaceAll(tasks: ChecklistTemplateTask[]): void;
}

export interface ChecklistTemplateAuditRepository {
  list(): ChecklistTemplateAudit[];
  create(entry: ChecklistTemplateAudit): ChecklistTemplateAudit;
  replaceAll(entries: ChecklistTemplateAudit[]): void;
}

export interface EmployeeExitClearanceFormRepository {
  list(): EmployeeExitClearanceForm[];
  getById(id: string): EmployeeExitClearanceForm | undefined;
  getByCaseId(caseId: string): EmployeeExitClearanceForm | undefined;
  getByEmployeeId(employeeId: string): EmployeeExitClearanceForm | undefined;
  create(form: EmployeeExitClearanceForm): EmployeeExitClearanceForm;
  update(form: EmployeeExitClearanceForm): EmployeeExitClearanceForm;
  replaceAll(forms: EmployeeExitClearanceForm[]): void;
}

export interface ExitClearanceTemplateRepository {
  list(): ExitClearanceTemplateItem[];
  listActive(): ExitClearanceTemplateItem[];
  getById(id: string): ExitClearanceTemplateItem | undefined;
  create(item: ExitClearanceTemplateItem): ExitClearanceTemplateItem;
  update(item: ExitClearanceTemplateItem): ExitClearanceTemplateItem;
  delete(id: string): void;
  replaceAll(items: ExitClearanceTemplateItem[]): void;
}

export interface InductionFormRepository {
  list(): import("../induction-types").InductionChecklistForm[];
  getById(
    id: string
  ): import("../induction-types").InductionChecklistForm | undefined;
  getByEmployeeId(
    employeeId: string
  ): import("../induction-types").InductionChecklistForm[];
  create(
    form: import("../induction-types").InductionChecklistForm
  ): import("../induction-types").InductionChecklistForm;
  update(
    form: import("../induction-types").InductionChecklistForm
  ): import("../induction-types").InductionChecklistForm;
  replaceAll(forms: import("../induction-types").InductionChecklistForm[]): void;
}

export interface AccessCardFormRepository {
  list(): import("../access-card-types").SecurityAccessCardApplication[];
  getById(
    id: string
  ): import("../access-card-types").SecurityAccessCardApplication | undefined;
  getByEmployeeId(
    employeeId: string
  ): import("../access-card-types").SecurityAccessCardApplication[];
  create(
    form: import("../access-card-types").SecurityAccessCardApplication
  ): import("../access-card-types").SecurityAccessCardApplication;
  update(
    form: import("../access-card-types").SecurityAccessCardApplication
  ): import("../access-card-types").SecurityAccessCardApplication;
  replaceAll(
    forms: import("../access-card-types").SecurityAccessCardApplication[]
  ): void;
}

export interface LaptopRequestRepository {
  list(): import("../laptop-request-types").LaptopRequest[];
  getById(
    id: string
  ): import("../laptop-request-types").LaptopRequest | undefined;
  getByCaseId(
    caseId: string
  ): import("../laptop-request-types").LaptopRequest | undefined;
  getByEmployeeId(
    employeeId: string
  ): import("../laptop-request-types").LaptopRequest | undefined;
  create(
    request: import("../laptop-request-types").LaptopRequest
  ): import("../laptop-request-types").LaptopRequest;
  update(
    request: import("../laptop-request-types").LaptopRequest
  ): import("../laptop-request-types").LaptopRequest;
  replaceAll(
    requests: import("../laptop-request-types").LaptopRequest[]
  ): void;
}

/** Aggregate repository surface used by the application service. */
export interface UnitOfWork {
  employees: EmployeeRepository;
  onboardingCases: OnboardingCaseRepository;
  offboardingCases: OffboardingCaseRepository;
  tasks: ChecklistTaskRepository;
  activity: ActivityRepository;
  assignmentRules: AssignmentRuleRepository;
  mockEmails: MockEmailRepository;
  automationRuns: AutomationRunRepository;
  checklistTemplates: ChecklistTemplateRepository;
  checklistTemplateAudits: ChecklistTemplateAuditRepository;
  exitClearanceForms: EmployeeExitClearanceFormRepository;
  exitClearanceTemplates: ExitClearanceTemplateRepository;
  inductionForms: InductionFormRepository;
  accessCardForms: AccessCardFormRepository;
  laptopRequests: LaptopRequestRepository;
  getAutomationMode(): "simulation" | "live";
  setAutomationMode(mode: "simulation" | "live"): void;
  persist(): void;
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
  }): void;
  snapshot(): {
    employees: Employee[];
    onboardingCases: OnboardingCase[];
    offboardingCases: OffboardingCase[];
    tasks: ChecklistTask[];
    activity: ActivityHistory[];
    assignmentRules: AssignmentRule[];
    mockEmails: MockEmail[];
    automationRuns: AutomationRun[];
    checklistTemplates: ChecklistTemplateTask[];
    checklistTemplateAudits: ChecklistTemplateAudit[];
    exitClearanceForms: EmployeeExitClearanceForm[];
    exitClearanceTemplates: ExitClearanceTemplateItem[];
    inductionForms: import("../induction-types").InductionChecklistForm[];
    accessCardForms: import("../access-card-types").SecurityAccessCardApplication[];
    laptopRequests: import("../laptop-request-types").LaptopRequest[];
    settings: { automationMode: "simulation" | "live" };
    version: number;
  };
}

export type { TaskStatus };
