import type {
  AssignmentRule,
  ChecklistGroup,
  Employee,
  PayloadResponsibleTeam,
  ResponsibleTeam,
} from "./types";

export const RESPONSIBLE_TEAMS: ResponsibleTeam[] = [
  "HR Operations",
  "IT Security",
  "Onsite IT Support",
  "Facilities / Building Management",
  "Hiring Manager",
  "Finance / Administration",
  "Corporate Card Admin",
  "Administration",
  "Quality",
  "Product Stewardship",
];

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  "HR Checklist",
  "IT Checklist",
  "Facilities Checklist",
  "Hiring Manager Checklist",
  "Finance Checklist",
];

/** Legacy blueprint — prefer ChecklistTemplateTask via repository for new cases. */
export const CHECKLIST_BLUEPRINT: Array<{
  group: ChecklistGroup;
  title: string;
  responsibleTeam: ResponsibleTeam;
  dayOffset: number;
}> = [
  {
    group: "HR Checklist",
    title: "Send induction pack",
    responsibleTeam: "HR Operations",
    dayOffset: -5,
  },
  {
    group: "IT Checklist",
    title: "Create Network ID",
    responsibleTeam: "IT Security",
    dayOffset: -7,
  },
  {
    group: "IT Checklist",
    title: "Create Email",
    responsibleTeam: "IT Security",
    dayOffset: -6,
  },
  {
    group: "IT Checklist",
    title: "SailPoint Access",
    responsibleTeam: "IT Security",
    dayOffset: -5,
  },
  {
    group: "IT Checklist",
    title: "Laptop Assigned",
    responsibleTeam: "Onsite IT Support",
    dayOffset: -4,
  },
  {
    group: "IT Checklist",
    title: "Software Installed",
    responsibleTeam: "Onsite IT Support",
    dayOffset: -3,
  },
  {
    group: "Facilities Checklist",
    title: "Access Card",
    responsibleTeam: "Facilities / Building Management",
    dayOffset: -4,
  },
  {
    group: "Facilities Checklist",
    title: "Parking Access",
    responsibleTeam: "Facilities / Building Management",
    dayOffset: -3,
  },
  {
    group: "Facilities Checklist",
    title: "Building Access",
    responsibleTeam: "Facilities / Building Management",
    dayOffset: -2,
  },
  {
    group: "Facilities Checklist",
    title: "EHS Briefing",
    responsibleTeam: "Facilities / Building Management",
    /** Due before the employee's first working day. */
    dayOffset: -1,
  },
  {
    group: "Hiring Manager Checklist",
    title: "Buddy Assigned",
    responsibleTeam: "Hiring Manager",
    dayOffset: -5,
  },
  {
    group: "Hiring Manager Checklist",
    title: "Team Introduction",
    responsibleTeam: "Hiring Manager",
    dayOffset: -3,
  },
  {
    group: "Hiring Manager Checklist",
    title: "Training Plan Prepared",
    responsibleTeam: "Hiring Manager",
    dayOffset: -4,
  },
  {
    group: "Hiring Manager Checklist",
    title: "First Week Schedule Ready",
    responsibleTeam: "Hiring Manager",
    dayOffset: -2,
  },
];

/** Default assignment matrix — mock company emails (no real credentials). */
export const DEFAULT_ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    id: "rule-hr-induction",
    responsibleTeam: "HR Operations",
    checklistGroup: "HR Checklist",
    taskName: "Send induction pack",
    location: "*",
    department: "*",
    assignedEmail: "hr@ppg-demo.com",
    assignedPersonName: "Siti Aminah bt Yusof",
    active: true,
  },
  {
    id: "rule-itsec-network",
    responsibleTeam: "IT Security",
    checklistGroup: "IT Checklist",
    taskName: "Create Network ID",
    location: "*",
    department: "*",
    assignedEmail: "itsecurity@ppg-demo.com",
    assignedPersonName: "Zulkarnain bin Hassan",
    active: true,
  },
  {
    id: "rule-itsec-email",
    responsibleTeam: "IT Security",
    checklistGroup: "IT Checklist",
    taskName: "Create Email",
    location: "*",
    department: "*",
    assignedEmail: "itsecurity@ppg-demo.com",
    assignedPersonName: "Zulkarnain bin Hassan",
    active: true,
  },
  {
    id: "rule-itsec-sailpoint",
    responsibleTeam: "IT Security",
    checklistGroup: "IT Checklist",
    taskName: "SailPoint Access",
    location: "*",
    department: "*",
    assignedEmail: "itsecurity@ppg-demo.com",
    assignedPersonName: "Zulkarnain bin Hassan",
    active: true,
  },
  {
    id: "rule-onsite-laptop",
    responsibleTeam: "Onsite IT Support",
    checklistGroup: "IT Checklist",
    taskName: "Laptop Assigned",
    location: "*",
    department: "*",
    assignedEmail: "itsupport@ppg-demo.com",
    assignedPersonName: "Ariff bin Razak",
    active: true,
  },
  {
    id: "rule-onsite-software",
    responsibleTeam: "Onsite IT Support",
    checklistGroup: "IT Checklist",
    taskName: "Software Installed",
    location: "*",
    department: "*",
    assignedEmail: "itsupport@ppg-demo.com",
    assignedPersonName: "Ariff bin Razak",
    active: true,
  },
  {
    id: "rule-fac-card",
    responsibleTeam: "Facilities / Building Management",
    checklistGroup: "Facilities Checklist",
    taskName: "Access Card",
    location: "*",
    department: "*",
    assignedEmail: "facilities@ppg-demo.com",
    assignedPersonName: "Roslan bin Omar",
    active: true,
  },
  {
    id: "rule-fac-parking",
    responsibleTeam: "Facilities / Building Management",
    checklistGroup: "Facilities Checklist",
    taskName: "Parking Access",
    location: "*",
    department: "*",
    assignedEmail: "facilities@ppg-demo.com",
    assignedPersonName: "Roslan bin Omar",
    active: true,
  },
  {
    id: "rule-fac-building",
    responsibleTeam: "Facilities / Building Management",
    checklistGroup: "Facilities Checklist",
    taskName: "Building Access",
    location: "*",
    department: "*",
    assignedEmail: "facilities@ppg-demo.com",
    assignedPersonName: "Roslan bin Omar",
    active: true,
  },
  {
    id: "rule-fac-ehs",
    responsibleTeam: "Facilities / Building Management",
    checklistGroup: "Facilities Checklist",
    taskName: "EHS Briefing",
    location: "*",
    department: "*",
    assignedEmail: "facilities@ppg-demo.com",
    assignedPersonName: "Roslan bin Omar",
    active: true,
  },
  // Hiring Manager rules use placeholders — resolved from employee at runtime
  {
    id: "rule-mgr-buddy",
    responsibleTeam: "Hiring Manager",
    checklistGroup: "Hiring Manager Checklist",
    taskName: "Buddy Assigned",
    location: "*",
    department: "*",
    assignedEmail: "",
    assignedPersonName: "",
    active: true,
  },
  {
    id: "rule-mgr-intro",
    responsibleTeam: "Hiring Manager",
    checklistGroup: "Hiring Manager Checklist",
    taskName: "Team Introduction",
    location: "*",
    department: "*",
    assignedEmail: "",
    assignedPersonName: "",
    active: true,
  },
  {
    id: "rule-mgr-training",
    responsibleTeam: "Hiring Manager",
    checklistGroup: "Hiring Manager Checklist",
    taskName: "Training Plan Prepared",
    location: "*",
    department: "*",
    assignedEmail: "",
    assignedPersonName: "",
    active: true,
  },
  {
    id: "rule-mgr-schedule",
    responsibleTeam: "Hiring Manager",
    checklistGroup: "Hiring Manager Checklist",
    taskName: "First Week Schedule Ready",
    location: "*",
    department: "*",
    assignedEmail: "",
    assignedPersonName: "",
    active: true,
  },
];

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function matchAssignmentRule(
  rules: AssignmentRule[],
  taskName: string,
  employee: Pick<Employee, "location" | "department" | "managerName" | "managerEmail">
): {
  responsibleTeam: ResponsibleTeam;
  assignedPersonName: string;
  assignedEmail: string;
  checklistGroup: ChecklistGroup;
} | null {
  const rule = rules.find(
    (r) =>
      r.active &&
      r.taskName === taskName &&
      (r.location === "*" || r.location === employee.location) &&
      (r.department === "*" || r.department === employee.department)
  );
  if (!rule) return null;

  if (rule.responsibleTeam === "Hiring Manager") {
    return {
      responsibleTeam: "Hiring Manager",
      assignedPersonName: employee.managerName,
      assignedEmail: employee.managerEmail,
      checklistGroup: rule.checklistGroup,
    };
  }

  return {
    responsibleTeam: rule.responsibleTeam,
    assignedPersonName: rule.assignedPersonName,
    assignedEmail: rule.assignedEmail,
    checklistGroup: rule.checklistGroup,
  };
}

export function toPayloadTeamName(
  team: ResponsibleTeam
): PayloadResponsibleTeam {
  if (team === "Facilities / Building Management") return "Facilities";
  return team as PayloadResponsibleTeam;
}
