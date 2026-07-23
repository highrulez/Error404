import type { ResponsibleTeam } from "./types";
import type {
  ChecklistTemplateTask,
  ChecklistTemplateTaskInput,
  TemplateChecklistGroup,
} from "./template-types";
import { TEAMS_FOR_TEMPLATE_GROUP } from "./template-types";

export function wouldCreateCircularDependency(
  taskId: string,
  dependencyIds: string[],
  allTemplates: ChecklistTemplateTask[]
): boolean {
  const byId = new Map(allTemplates.map((t) => [t.id, t]));
  const visiting = new Set<string>();

  function dfs(id: string): boolean {
    if (id === taskId) return true;
    if (visiting.has(id)) return false;
    visiting.add(id);
    const node = byId.get(id);
    for (const dep of node?.dependencyTemplateTaskIds ?? []) {
      if (dfs(dep)) return true;
    }
    return false;
  }

  return dependencyIds.some((depId) => dfs(depId));
}

export function validateTemplateTaskInput(
  input: ChecklistTemplateTaskInput,
  allTemplates: ChecklistTemplateTask[],
  editingId?: string
): string | null {
  const title = input.title?.trim() ?? "";
  if (!title) return "Task name is required.";

  const teams = TEAMS_FOR_TEMPLATE_GROUP[input.checklistGroup];
  if (!teams?.includes(input.responsibleTeam)) {
    return `Responsible team must be valid for the ${input.checklistGroup} group.`;
  }

  if (
    input.responsibleTeam === "Hiring Manager" ||
    input.checklistGroup === "Hiring Manager"
  ) {
    if (input.assignedEmailRule !== "Employee Manager Email") {
      return "Hiring Manager tasks must use Employee Manager Email.";
    }
  }

  if (input.assignedEmailRule === "Fixed Team Email") {
    if (!input.fixedAssignedEmail?.trim()) {
      return "Fixed assigned email is required when Fixed Team Email is selected.";
    }
  }

  if (input.escalationEmailRule === "Fixed Email") {
    if (!input.fixedEscalationEmail?.trim()) {
      return "Fixed escalation email is required when Fixed Email is selected.";
    }
  }

  if (!Number.isFinite(input.sortOrder) || input.sortOrder < 1) {
    return "Sort order must be a positive number.";
  }

  const deps = input.dependencyTemplateTaskIds ?? [];
  const selfId = editingId ?? input.id;
  if (selfId && deps.includes(selfId)) {
    return "A task cannot depend on itself.";
  }

  const others = allTemplates.filter((t) => t.id !== selfId);
  const probe: ChecklistTemplateTask = {
    id: selfId || "__new__",
    processType: input.processType ?? "Onboarding",
    checklistGroup: input.checklistGroup,
    responsibleTeam: input.responsibleTeam,
    title,
    description: input.description ?? "",
    active: input.active ?? true,
    required: input.required ?? true,
    sortOrder: input.sortOrder,
    dueOffsetDays: input.dueOffsetDays ?? 0,
    dependencyTemplateTaskIds: deps,
    assignedEmailRule: input.assignedEmailRule,
    fixedAssignedEmail: input.fixedAssignedEmail ?? "",
    reminderEnabled: input.reminderEnabled ?? true,
    firstReminderAfterWorkingDays: input.firstReminderAfterWorkingDays ?? 2,
    reminderFrequencyWorkingDays: input.reminderFrequencyWorkingDays ?? 2,
    maximumReminderCount: input.maximumReminderCount ?? 2,
    escalationAfterWorkingDays: input.escalationAfterWorkingDays ?? 6,
    escalationEmailRule: input.escalationEmailRule ?? "Admin",
    fixedEscalationEmail: input.fixedEscalationEmail ?? "",
    securityCritical: input.securityCritical,
    executionMode: input.executionMode,
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
  };
  if (
    wouldCreateCircularDependency(
      probe.id,
      deps,
      [...others, probe]
    )
  ) {
    return "Circular dependencies are not allowed.";
  }

  return null;
}

export function sortTemplates(
  templates: ChecklistTemplateTask[]
): ChecklistTemplateTask[] {
  const groupOrder: TemplateChecklistGroup[] = [
    "HR",
    "IT",
    "Facilities",
    "Hiring Manager",
    "Finance",
  ];
  return [...templates].sort((a, b) => {
    const ga = groupOrder.indexOf(a.checklistGroup);
    const gb = groupOrder.indexOf(b.checklistGroup);
    if (ga !== gb) return ga - gb;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });
}

export function defaultFixedEmailForTeam(team: ResponsibleTeam): string {
  const map: Record<ResponsibleTeam, string> = {
    "HR Operations": "hr@ppg-demo.com",
    "IT Security": "itsecurity@ppg-demo.com",
    "Onsite IT Support": "itsupport@ppg-demo.com",
    "Facilities / Building Management": "facilities@ppg-demo.com",
    "Hiring Manager": "",
    "Finance / Administration": "finance@ppg-demo.com",
    "Corporate Card Admin": "corporatecard@ppg-demo.com",
    Administration: "administration@ppg-demo.com",
    Quality: "quality@ppg-demo.com",
    "Product Stewardship": "productstewardship@ppg-demo.com",
  };
  return map[team] ?? "";
}
