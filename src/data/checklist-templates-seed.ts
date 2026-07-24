import { TEAM_ASSIGNED_EMAIL } from "./auth-accounts";
import type { ChecklistTemplateTask } from "./template-types";

const SEED_AT = "2026-07-20T09:00:00.000Z";
const ACTOR = "System";

const IDS = {
  induction: "tmpl-send-induction-pack",
  network: "tmpl-create-network-id",
  email: "tmpl-create-email",
  sailpoint: "tmpl-sailpoint-access",
  laptopDecision: "tmpl-laptop-decision",
  laptopPo: "tmpl-laptop-po",
  laptopPrepare: "tmpl-laptop-prepare",
  laptop: "tmpl-laptop-assigned",
  software: "tmpl-software-installed",
  accessCard: "tmpl-access-card",
  parking: "tmpl-parking-access",
  building: "tmpl-building-access",
  ehs: "tmpl-ehs-briefing",
  buddy: "tmpl-buddy-assigned",
  intro: "tmpl-team-introduction",
  training: "tmpl-training-plan",
  schedule: "tmpl-first-week-schedule",
} as const;

function base(
  partial: Omit<
    ChecklistTemplateTask,
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "active"
    | "required"
    | "processType"
    | "reminderEnabled"
    | "firstReminderAfterWorkingDays"
    | "reminderFrequencyWorkingDays"
    | "maximumReminderCount"
    | "escalationAfterWorkingDays"
    | "escalationEmailRule"
    | "fixedEscalationEmail"
  > & {
    active?: boolean;
    required?: boolean;
    reminderEnabled?: boolean;
    firstReminderAfterWorkingDays?: number;
    reminderFrequencyWorkingDays?: number;
    maximumReminderCount?: number;
    escalationAfterWorkingDays?: number;
    escalationEmailRule?: ChecklistTemplateTask["escalationEmailRule"];
    fixedEscalationEmail?: string;
  }
): ChecklistTemplateTask {
  return {
    processType: "Onboarding",
    active: true,
    required: true,
    reminderEnabled: true,
    firstReminderAfterWorkingDays: 2,
    reminderFrequencyWorkingDays: 2,
    maximumReminderCount: 2,
    escalationAfterWorkingDays: 6,
    escalationEmailRule: "Admin",
    fixedEscalationEmail: "",
    createdAt: SEED_AT,
    updatedAt: SEED_AT,
    createdBy: ACTOR,
    updatedBy: ACTOR,
    ...partial,
  };
}

/** Default onboarding checklist template tasks with IT and laptop dependency chain. */
export function createDefaultChecklistTemplates(): ChecklistTemplateTask[] {
  return [
    base({
      id: IDS.induction,
      checklistGroup: "HR",
      responsibleTeam: "HR Operations",
      title: "Send induction pack",
      description: "Send the new-hire induction pack and welcome materials.",
      sortOrder: 10,
      dueOffsetDays: -5,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["HR Operations"],
    }),
    base({
      id: IDS.network,
      checklistGroup: "IT",
      responsibleTeam: "IT Security",
      title: "Create Network ID",
      description: "Provision the employee network / domain account.",
      sortOrder: 10,
      dueOffsetDays: -7,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["IT Security"],
    }),
    base({
      id: IDS.email,
      checklistGroup: "IT",
      responsibleTeam: "IT Security",
      title: "Create Email",
      description: "Create the corporate email mailbox.",
      sortOrder: 20,
      dueOffsetDays: -6,
      dependencyTemplateTaskIds: [IDS.network],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["IT Security"],
    }),
    base({
      id: IDS.sailpoint,
      checklistGroup: "IT",
      responsibleTeam: "IT Security",
      title: "SailPoint Access",
      description: "Grant SailPoint identity and access entitlements.",
      sortOrder: 30,
      dueOffsetDays: -5,
      dependencyTemplateTaskIds: [IDS.email],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["IT Security"],
    }),
    base({
      id: IDS.laptopDecision,
      checklistGroup: "Hiring Manager",
      responsibleTeam: "Hiring Manager",
      title: "Laptop Requirement Decision",
      description:
        "Confirm whether the new hire requires a company laptop before procurement.",
      sortOrder: 5,
      dueOffsetDays: -5,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 3,
      requiresPurchaseOrder: false,
    }),
    base({
      id: IDS.laptopPo,
      checklistGroup: "Finance",
      responsibleTeam: "Administration",
      title: "Create Laptop Purchase Order",
      description:
        "Create the purchase order after the manager confirms a laptop is required.",
      sortOrder: 35,
      dueOffsetDays: -4,
      dependencyTemplateTaskIds: [IDS.laptopDecision],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: "admin@ppg-demo.com",
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 2,
      escalationAfterWorkingDays: 2,
      requiresPurchaseOrder: true,
    }),
    base({
      id: IDS.laptopPrepare,
      checklistGroup: "IT",
      responsibleTeam: "Onsite IT Support",
      title: "Prepare Laptop",
      description:
        "Prepare equipment for the new hire after IT Security provisioning. Not blocked by purchase order.",
      sortOrder: 38,
      dueOffsetDays: -3,
      // Handoff depends only on IT Security — never on PO / delivery
      dependencyTemplateTaskIds: [IDS.network, IDS.email, IDS.sailpoint],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Onsite IT Support"],
      requiresPurchaseOrder: false,
    }),
    base({
      id: IDS.laptop,
      checklistGroup: "IT",
      responsibleTeam: "Onsite IT Support",
      title: "Laptop Assigned",
      description: "Assign the prepared laptop to the employee.",
      sortOrder: 40,
      dueOffsetDays: -4,
      dependencyTemplateTaskIds: [
        IDS.network,
        IDS.email,
        IDS.sailpoint,
        IDS.laptopPrepare,
      ],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Onsite IT Support"],
    }),
    base({
      id: IDS.software,
      checklistGroup: "IT",
      responsibleTeam: "Onsite IT Support",
      title: "Software Installed",
      description: "Install required business applications on the laptop.",
      sortOrder: 50,
      dueOffsetDays: -3,
      dependencyTemplateTaskIds: [IDS.laptop],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Onsite IT Support"],
    }),
    base({
      id: IDS.accessCard,
      checklistGroup: "Facilities",
      responsibleTeam: "Facilities / Building Management",
      title: "Access Card",
      description: "Issue building access badge / card.",
      sortOrder: 10,
      dueOffsetDays: -4,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Facilities / Building Management"],
    }),
    base({
      id: IDS.parking,
      checklistGroup: "Facilities",
      responsibleTeam: "Facilities / Building Management",
      title: "Parking Access",
      description: "Provision parking access for the work location.",
      sortOrder: 20,
      dueOffsetDays: -3,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Facilities / Building Management"],
    }),
    base({
      id: IDS.building,
      checklistGroup: "Facilities",
      responsibleTeam: "Facilities / Building Management",
      title: "Building Access",
      description: "Confirm building / floor access rights.",
      sortOrder: 30,
      dueOffsetDays: -2,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Facilities / Building Management"],
    }),
    base({
      id: IDS.ehs,
      checklistGroup: "Facilities",
      responsibleTeam: "Facilities / Building Management",
      title: "EHS Briefing",
      description: "Complete Environment, Health & Safety briefing before day one.",
      sortOrder: 40,
      dueOffsetDays: -1,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Fixed Team Email",
      fixedAssignedEmail: TEAM_ASSIGNED_EMAIL["Facilities / Building Management"],
    }),
    base({
      id: IDS.buddy,
      checklistGroup: "Hiring Manager",
      responsibleTeam: "Hiring Manager",
      title: "Buddy Assigned",
      description: "Assign an onboarding buddy for the new hire.",
      sortOrder: 10,
      dueOffsetDays: -5,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
    }),
    base({
      id: IDS.intro,
      checklistGroup: "Hiring Manager",
      responsibleTeam: "Hiring Manager",
      title: "Team Introduction",
      description: "Schedule team introductions for the new hire.",
      sortOrder: 20,
      dueOffsetDays: -3,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
    }),
    base({
      id: IDS.training,
      checklistGroup: "Hiring Manager",
      responsibleTeam: "Hiring Manager",
      title: "Training Plan Prepared",
      description: "Prepare the initial training plan.",
      sortOrder: 30,
      dueOffsetDays: -4,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
    }),
    base({
      id: IDS.schedule,
      checklistGroup: "Hiring Manager",
      responsibleTeam: "Hiring Manager",
      title: "First Week Schedule Ready",
      description: "Finalize the first-week schedule.",
      sortOrder: 40,
      dueOffsetDays: -2,
      dependencyTemplateTaskIds: [],
      assignedEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
    }),
  ];
}

export const DEFAULT_TEMPLATE_TASK_IDS = IDS;
