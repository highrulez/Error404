import type {
  ActivityHistory,
  AssignmentRule,
  ChecklistTask,
  Employee,
  OnboardingCase,
  ResponsibleTeam,
} from "../types";
import type { OffboardingCase } from "../offboarding-types";
import type {
  ActivityRepository,
  AssignmentRuleRepository,
  ChecklistTaskRepository,
  EmployeeRepository,
  OffboardingCaseRepository,
  OnboardingCaseRepository,
  UnitOfWork,
} from "./interfaces";

/**
 * Placeholder Dataverse repositories.
 * TODO: Wire Microsoft Dataverse Web API when Phase 2 credentials / env are available.
 * Do not call fake Dataverse endpoints from this prototype.
 */

function notImplemented(method: string): never {
  throw new Error(
    `DataverseRepository.${method} is not implemented yet. ` +
      `TODO: Connect to Microsoft Dataverse Web API (no fake API calls in Phase 1).`
  );
}

export class DataverseEmployeeRepository implements EmployeeRepository {
  list(): Employee[] {
    // TODO: GET /api/data/v9.2/cr_employees
    return notImplemented("employees.list");
  }
  getById(): Employee | undefined {
    // TODO: GET /api/data/v9.2/cr_employees(id)
    return notImplemented("employees.getById");
  }
  create(): Employee {
    // TODO: POST /api/data/v9.2/cr_employees
    return notImplemented("employees.create");
  }
  update(): Employee {
    // TODO: PATCH /api/data/v9.2/cr_employees(id)
    return notImplemented("employees.update");
  }
  replaceAll(): void {
    // TODO: Bulk sync from Dataverse
    return notImplemented("employees.replaceAll");
  }
}

export class DataverseOnboardingCaseRepository implements OnboardingCaseRepository {
  list(): OnboardingCase[] {
    // TODO: GET /api/data/v9.2/cr_onboardingcases
    return notImplemented("onboardingCases.list");
  }
  getById(): OnboardingCase | undefined {
    // TODO: GET by primary key
    return notImplemented("onboardingCases.getById");
  }
  getByEmployeeId(): OnboardingCase | undefined {
    // TODO: Filter by employee lookup
    return notImplemented("onboardingCases.getByEmployeeId");
  }
  create(): OnboardingCase {
    // TODO: POST onboarding case
    return notImplemented("onboardingCases.create");
  }
  update(): OnboardingCase {
    // TODO: PATCH onboarding case
    return notImplemented("onboardingCases.update");
  }
  replaceAll(): void {
    return notImplemented("onboardingCases.replaceAll");
  }
}

export class DataverseOffboardingCaseRepository
  implements OffboardingCaseRepository
{
  list(): OffboardingCase[] {
    // TODO: GET /api/data/v9.2/cr_offboardingcases
    return notImplemented("offboardingCases.list");
  }
  getById(): OffboardingCase | undefined {
    // TODO: GET by primary key
    return notImplemented("offboardingCases.getById");
  }
  getByEmployeeId(): OffboardingCase | undefined {
    // TODO: Filter by employee lookup
    return notImplemented("offboardingCases.getByEmployeeId");
  }
  create(): OffboardingCase {
    // TODO: POST offboarding case
    return notImplemented("offboardingCases.create");
  }
  update(): OffboardingCase {
    // TODO: PATCH offboarding case
    return notImplemented("offboardingCases.update");
  }
  replaceAll(): void {
    return notImplemented("offboardingCases.replaceAll");
  }
}

export class DataverseChecklistTaskRepository implements ChecklistTaskRepository {
  list(): ChecklistTask[] {
    // TODO: GET /api/data/v9.2/cr_checklisttasks
    return notImplemented("tasks.list");
  }
  getById(): ChecklistTask | undefined {
    return notImplemented("tasks.getById");
  }
  listByCaseId(): ChecklistTask[] {
    return notImplemented("tasks.listByCaseId");
  }
  listByAssigneeEmail(): ChecklistTask[] {
    return notImplemented("tasks.listByAssigneeEmail");
  }
  listByResponsibleTeam(_team: ResponsibleTeam): ChecklistTask[] {
    return notImplemented("tasks.listByResponsibleTeam");
  }
  createMany(): ChecklistTask[] {
    return notImplemented("tasks.createMany");
  }
  update(): ChecklistTask {
    return notImplemented("tasks.update");
  }
  updateMany(): void {
    return notImplemented("tasks.updateMany");
  }
  replaceAll(): void {
    return notImplemented("tasks.replaceAll");
  }
}

export class DataverseActivityRepository implements ActivityRepository {
  list(): ActivityHistory[] {
    // TODO: GET activity history table
    return notImplemented("activity.list");
  }
  listByCaseId(): ActivityHistory[] {
    return notImplemented("activity.listByCaseId");
  }
  create(): ActivityHistory {
    return notImplemented("activity.create");
  }
  replaceAll(): void {
    return notImplemented("activity.replaceAll");
  }
}

export class DataverseAssignmentRuleRepository implements AssignmentRuleRepository {
  list(): AssignmentRule[] {
    // TODO: GET assignment rules from Dataverse
    return notImplemented("assignmentRules.list");
  }
  getById(): AssignmentRule | undefined {
    return notImplemented("assignmentRules.getById");
  }
  listActive(): AssignmentRule[] {
    return notImplemented("assignmentRules.listActive");
  }
  replaceAll(): void {
    return notImplemented("assignmentRules.replaceAll");
  }
}

/**
 * Aggregate Dataverse unit of work (unused until Phase 2).
 * TODO: Inject authenticated Dataverse client; switch via feature flag / env.
 */
export class DataverseRepository implements UnitOfWork {
  readonly employees = new DataverseEmployeeRepository();
  readonly onboardingCases = new DataverseOnboardingCaseRepository();
  readonly offboardingCases = new DataverseOffboardingCaseRepository();
  readonly tasks = new DataverseChecklistTaskRepository();
  readonly activity = new DataverseActivityRepository();
  readonly assignmentRules = new DataverseAssignmentRuleRepository();
  readonly mockEmails = {
    list: () => notImplemented("mockEmails.list") as never,
    getById: () => notImplemented("mockEmails.getById") as never,
    createMany: () => notImplemented("mockEmails.createMany"),
    update: () => notImplemented("mockEmails.update"),
    replaceAll: () => notImplemented("mockEmails.replaceAll"),
  };
  readonly automationRuns = {
    list: () => notImplemented("automationRuns.list") as never,
    getById: () => notImplemented("automationRuns.getById") as never,
    create: () => notImplemented("automationRuns.create"),
    update: () => notImplemented("automationRuns.update"),
    replaceAll: () => notImplemented("automationRuns.replaceAll"),
  };
  readonly checklistTemplates = {
    list: () => notImplemented("checklistTemplates.list") as never,
    listActive: () => notImplemented("checklistTemplates.listActive") as never,
    getById: () => notImplemented("checklistTemplates.getById") as never,
    create: () => notImplemented("checklistTemplates.create") as never,
    update: () => notImplemented("checklistTemplates.update") as never,
    delete: () => notImplemented("checklistTemplates.delete"),
    replaceAll: () => notImplemented("checklistTemplates.replaceAll"),
  };
  readonly checklistTemplateAudits = {
    list: () => notImplemented("checklistTemplateAudits.list") as never,
    create: () => notImplemented("checklistTemplateAudits.create") as never,
    replaceAll: () => notImplemented("checklistTemplateAudits.replaceAll"),
  };
  readonly exitClearanceForms = {
    list: () => notImplemented("exitClearanceForms.list") as never,
    getById: () => notImplemented("exitClearanceForms.getById") as never,
    getByCaseId: () => notImplemented("exitClearanceForms.getByCaseId") as never,
    getByEmployeeId: () =>
      notImplemented("exitClearanceForms.getByEmployeeId") as never,
    create: () => notImplemented("exitClearanceForms.create") as never,
    update: () => notImplemented("exitClearanceForms.update") as never,
    replaceAll: () => notImplemented("exitClearanceForms.replaceAll"),
  };
  readonly exitClearanceTemplates = {
    list: () => notImplemented("exitClearanceTemplates.list") as never,
    listActive: () => notImplemented("exitClearanceTemplates.listActive") as never,
    getById: () => notImplemented("exitClearanceTemplates.getById") as never,
    create: () => notImplemented("exitClearanceTemplates.create") as never,
    update: () => notImplemented("exitClearanceTemplates.update") as never,
    delete: () => notImplemented("exitClearanceTemplates.delete"),
    replaceAll: () => notImplemented("exitClearanceTemplates.replaceAll"),
  };
  readonly inductionForms = {
    list: () => notImplemented("inductionForms.list") as never,
    getById: () => notImplemented("inductionForms.getById") as never,
    getByEmployeeId: () => notImplemented("inductionForms.getByEmployeeId") as never,
    create: () => notImplemented("inductionForms.create") as never,
    update: () => notImplemented("inductionForms.update") as never,
    replaceAll: () => notImplemented("inductionForms.replaceAll"),
  };
  readonly accessCardForms = {
    list: () => notImplemented("accessCardForms.list") as never,
    getById: () => notImplemented("accessCardForms.getById") as never,
    getByEmployeeId: () => notImplemented("accessCardForms.getByEmployeeId") as never,
    create: () => notImplemented("accessCardForms.create") as never,
    update: () => notImplemented("accessCardForms.update") as never,
    replaceAll: () => notImplemented("accessCardForms.replaceAll"),
  };
  readonly laptopRequests = {
    list: () => notImplemented("laptopRequests.list") as never,
    getById: () => notImplemented("laptopRequests.getById") as never,
    getByCaseId: () => notImplemented("laptopRequests.getByCaseId") as never,
    getByEmployeeId: () => notImplemented("laptopRequests.getByEmployeeId") as never,
    create: () => notImplemented("laptopRequests.create") as never,
    update: () => notImplemented("laptopRequests.update") as never,
    replaceAll: () => notImplemented("laptopRequests.replaceAll"),
  };

  getAutomationMode(): "simulation" | "live" {
    // TODO: Read from Dataverse environment / app config
    return notImplemented("getAutomationMode");
  }
  setAutomationMode(): void {
    // TODO: Persist automation mode setting
    return notImplemented("setAutomationMode");
  }
  persist(): void {
    // TODO: No-op or flush batch — Dataverse writes are per-entity
    return notImplemented("persist");
  }
  reset(): void {
    // TODO: Not applicable for Dataverse production
    return notImplemented("reset");
  }
  snapshot() {
    return notImplemented("snapshot");
  }
}
