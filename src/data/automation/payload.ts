import { toPayloadTeamName, RESPONSIBLE_TEAMS } from "../checklist";
import type {
  ChecklistTask,
  Employee,
  OnboardingCase,
  PayloadResponsibleTeam,
  ResponsibleTeam,
} from "../types";

export interface NewHireAutomationPayload {
  eventType: "NewHireOnboardingCreated";
  employee: {
    employeeId: string;
    employeeName: string;
    employeeType: string;
    department: string;
    role: string;
    location: string;
    managerName: string;
    managerEmail: string;
    startDate: string;
  };
  onboardingCase: {
    caseId: string;
    status: string;
    progress: number;
  };
  taskGroups: Array<{
    responsibleTeam: PayloadResponsibleTeam;
    assignedEmail: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      responsibleTeam: string;
      assignedPersonName: string;
      assignedEmail: string;
      dueDate: string;
      completedAt: string | null;
      notificationStatus: string;
    }>;
  }>;
}

const PAYLOAD_TEAM_ORDER: ResponsibleTeam[] = [
  "HR Operations",
  "IT Security",
  "Onsite IT Support",
  "Facilities / Building Management",
  "Hiring Manager",
];

export function buildNewHireAutomationPayload(args: {
  employee: Employee;
  onboardingCase: OnboardingCase;
  tasks: ChecklistTask[];
}): NewHireAutomationPayload {
  const { employee, onboardingCase, tasks } = args;

  const taskGroups = PAYLOAD_TEAM_ORDER.map((team) => {
    const teamTasks = tasks.filter((t) => t.responsibleTeam === team);
    const assignedEmail =
      team === "Hiring Manager"
        ? employee.managerEmail
        : teamTasks[0]?.assignedEmail || "";
    return {
      responsibleTeam: toPayloadTeamName(team),
      assignedEmail,
      tasks: teamTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        responsibleTeam: t.responsibleTeam,
        assignedPersonName: t.assignedPersonName,
        assignedEmail: t.assignedEmail,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        notificationStatus: t.notificationStatus,
      })),
    };
  });

  return {
    eventType: "NewHireOnboardingCreated",
    employee: {
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeType: employee.employeeType,
      department: employee.department,
      role: employee.role,
      location: employee.location,
      managerName: employee.managerName,
      managerEmail: employee.managerEmail,
      startDate: employee.startDate,
    },
    onboardingCase: {
      caseId: onboardingCase.id,
      status: onboardingCase.status,
      progress: onboardingCase.overallProgress,
    },
    taskGroups,
  };
}

export { RESPONSIBLE_TEAMS };
