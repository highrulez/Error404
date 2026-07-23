import { addDays, matchAssignmentRule } from "./checklist";
import { addWorkingDays } from "./working-days";
import { applyDependencyGraph } from "./dependencies";
import { initReminderFieldsFromTemplate } from "./automation/reminder-engine";
import { sortTemplates } from "./template-validation";
import { TEMPLATE_GROUP_TO_CASE_GROUP } from "./template-types";
import { createBlankInductionForm } from "./induction-seed";
import { createBlankAccessCardForm } from "./access-card-seed";
import {
  INDUCTION_EMPLOYEE_TASK_TITLE,
} from "./induction-types";
import {
  ACCESS_CARD_EMPLOYEE_TASK_TITLE,
} from "./access-card-types";
import type { InductionChecklistForm } from "./induction-types";
import type { SecurityAccessCardApplication } from "./access-card-types";
import type {
  ActivityHistory,
  AppStore,
  ChecklistTask,
  Employee,
  OnboardingCase,
  TaskStatus,
} from "./types";
import type { AutomationRun, MockEmail } from "./auth-types";
import type { MockEmailAttachment } from "./exit-clearance-types";
import {
  ALICIA_ACCESS_CARD_FORM_ID,
  ALICIA_CASE_NUMBER,
  ALICIA_EMAIL,
  ALICIA_EMPLOYEE_ID,
  ALICIA_EMPLOYEE_NUMBER,
  ALICIA_INDUCTION_FORM_ID,
  ALICIA_ONBOARDING_CASE_ID,
  FIRST_DAY_TASK_TITLE,
  PERSONAL_INFO_TASK_TITLE,
  type FirstDayInstructionsContent,
} from "./alicia-types";
import { buildAliciaLaptopSeed } from "./laptop-request-workflow";
import type { LaptopRequest } from "./laptop-request-types";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Demo start date: ~10 working days from today (always in the future for demos). */
export function aliciaDemoStartDate(now = nowIso()): string {
  return addWorkingDays(now.slice(0, 10), 10).toISOString().slice(0, 10);
}

export function createAliciaEmployee(now = nowIso()): Employee {
  const startDate = aliciaDemoStartDate(now);
  return {
    id: ALICIA_EMPLOYEE_ID,
    employeeNumber: ALICIA_EMPLOYEE_NUMBER,
    fullName: "Alicia Wong",
    preferredName: "Alicia",
    email: ALICIA_EMAIL,
    phone: "+60 12-987 6543",
    department: "Customer Service",
    role: "Customer Service Specialist",
    location: "Malaysia – UOA Business Park",
    managerName: "Sarah Tan",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Preboarding",
    startDate,
    requiresOnboarding: true,
    createdAt: now,
    updatedAt: now,
    personalEmail: "alicia.wong.personal@example.com",
    emergencyContactName: "",
    emergencyContactNumber: "",
  };
}

export function createAliciaOnboardingCase(
  employee: Employee,
  now = nowIso()
): OnboardingCase {
  return {
    id: ALICIA_ONBOARDING_CASE_ID,
    caseNumber: ALICIA_CASE_NUMBER,
    employeeId: employee.id,
    status: "In Progress",
    overallProgress: 5,
    createdAt: now,
    updatedAt: now,
    lastWorkflowTriggeredAt: now,
    lastWorkflowError: null,
    accountCreatedEmailSent: false,
    accountCreatedEmailSentAt: null,
    accountCreatedEmailId: null,
  };
}

export function getAliciaFirstDayContent(
  employee: Employee
): FirstDayInstructionsContent {
  return {
    reportingDate: employee.startDate,
    reportingTime: "9:00 AM",
    officeLocation: employee.location,
    managerName: employee.managerName,
    contactPerson: "Amanda Lee (HR)",
    contactEmail: "hr@ppg-demo.com",
    dressCode: "Business casual",
    itemsToBring: [
      "Identity document (NRIC or passport)",
      "Bank account details for payroll",
      "Signed offer letter (if not already returned)",
    ],
    parkingOrArrival:
      "Report to UOA Business Park lobby reception. Bring photo ID for visitor pass.",
    emergencyContact: "HR Operations · hr@ppg-demo.com",
  };
}

function generateDeptTasks(
  employee: Employee,
  caseId: string,
  templates: AppStore["checklistTemplates"],
  rules: AppStore["assignmentRules"]
): ChecklistTask[] {
  const active = sortTemplates(
    templates.filter(
      (t) => t.active && (t.processType ?? "Onboarding") === "Onboarding"
    )
  );
  const templateToTaskId = new Map<string, string>();
  const assignedAt = nowIso();
  const draft = active.map((tmpl) => {
    const taskId = uid("tsk-alicia");
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
      false
    );
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
      ...reminder,
    };
  });
  const withDeps = draft.map((task, index) => {
    const tmpl = active[index];
    const dependencyTaskIds = (tmpl?.dependencyTemplateTaskIds ?? [])
      .map((id) => templateToTaskId.get(id))
      .filter(Boolean) as string[];
    return { ...task, dependencyTaskIds };
  });
  return applyDependencyGraph(withDeps);
}

function buildPersonalInfoTask(employee: Employee, caseId: string): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 2,
      reminderFrequencyWorkingDays: 2,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 5,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: "tsk-alicia-personal-info",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "HR Checklist",
    title: PERSONAL_INFO_TASK_TITLE,
    description: "Review and confirm your personal information on file.",
    instructions:
      "Check read-only employment details and update preferred name, personal email, phone, and emergency contacts.",
    status: "Pending",
    priority: "High",
    assignedOwner: employee.fullName,
    responsibleTeam: "HR Operations",
    assignedPersonName: employee.fullName,
    assignedEmail: employee.email,
    assignedUserName: employee.fullName,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: addWorkingDays(employee.startDate, -3).toISOString().slice(0, 10),
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    dependencyTaskIds: [],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 1,
    templateTaskId: null,
    taskType: "Review",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: employee.id,
    isPersonalInfoReviewTask: true,
    ...reminder,
  };
}

function buildFirstDayTask(employee: Employee, caseId: string): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 4,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: "tsk-alicia-first-day",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "HR Checklist",
    title: FIRST_DAY_TASK_TITLE,
    description: "Read and acknowledge your first-day reporting instructions.",
    instructions: "Review reporting time, location, dress code, and items to bring.",
    status: "Pending",
    priority: "Medium",
    assignedOwner: employee.fullName,
    responsibleTeam: "HR Operations",
    assignedPersonName: employee.fullName,
    assignedEmail: employee.email,
    assignedUserName: employee.fullName,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: addWorkingDays(employee.startDate, -1).toISOString().slice(0, 10),
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    dependencyTaskIds: [],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 2,
    templateTaskId: null,
    taskType: "Information",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: caseId,
    isFirstDayAckTask: true,
    ...reminder,
  };
}

function buildInductionEmployeeTask(
  employee: Employee,
  caseId: string,
  formId: string
): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 2,
      reminderFrequencyWorkingDays: 2,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 5,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: "tsk-alicia-induction-emp",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "HR Checklist",
    title: INDUCTION_EMPLOYEE_TASK_TITLE,
    description: "Complete the Induction Checklist for New Employees.",
    instructions: "Open the form, acknowledge sections, declare and submit.",
    status: "Pending",
    priority: "High",
    assignedOwner: employee.fullName,
    responsibleTeam: "HR Operations",
    assignedPersonName: employee.fullName,
    assignedEmail: employee.email,
    assignedUserName: employee.fullName,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: addWorkingDays(employee.startDate, -2).toISOString().slice(0, 10),
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    dependencyTaskIds: [],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 10,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Induction Checklist",
    sourceRecordId: formId,
    linkedInductionFormId: formId,
    isInductionEmployeeTask: true,
    ...reminder,
  };
}

function buildAccessCardEmployeeTask(
  employee: Employee,
  caseId: string,
  formId: string
): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 2,
      reminderFrequencyWorkingDays: 2,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 5,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: "tsk-alicia-access-emp",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "Facilities Checklist",
    title: ACCESS_CARD_EMPLOYEE_TASK_TITLE,
    description: "Complete the UOA Security Access Card Application.",
    instructions: "Fill applicant details, attach photo, declare and submit.",
    status: "Pending",
    priority: "High",
    assignedOwner: employee.fullName,
    responsibleTeam: "Administration",
    assignedPersonName: employee.fullName,
    assignedEmail: employee.email,
    assignedUserName: employee.fullName,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: addWorkingDays(employee.startDate, -5).toISOString().slice(0, 10),
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    dependencyTaskIds: [],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 11,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Access Card Application",
    sourceRecordId: formId,
    linkedAccessCardFormId: formId,
    isAccessCardEmployeeTask: true,
    ...reminder,
  };
}

function att(
  fileName: string,
  kind: MockEmailAttachment["kind"],
  formId: string
): MockEmailAttachment {
  const relatedFormType =
    kind === "induction-checklist"
      ? "Induction Checklist"
      : kind === "access-card-application"
        ? "Access Card Application"
        : null;
  return {
    id: uid("att-alicia"),
    fileName,
    kind,
    formId,
    openedAt: null,
    relatedFormType,
    relatedFormId: relatedFormType ? formId : null,
  };
}

export function buildAliciaWelcomeEmail(
  employee: Employee,
  inductionFormId: string,
  accessFormId: string
): MockEmail {
  const attachments: MockEmailAttachment[] = [
    att(
      "Alicia_Wong_Induction_Checklist.pdf",
      "induction-checklist",
      inductionFormId
    ),
    att(
      "Alicia_Wong_UOA_Security_Access_Card_Application.pdf",
      "access-card-application",
      accessFormId
    ),
    att(
      "Alicia_Wong_First_Day_Guide.pdf",
      "first-day-guide",
      ALICIA_ONBOARDING_CASE_ID
    ),
  ];
  return {
    id: "mail-alicia-welcome",
    automationRunId: "",
    from: "hr@ppg-demo.com",
    to: employee.email,
    cc: [],
    subject: "Welcome to PPG – Complete Your OneFlow Onboarding",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${employee.fullName},</p>
      <p>Welcome to PPG! Please complete your OneFlow onboarding actions before your start date.</p>
      <p>
        Employee ID: ${employee.employeeNumber}<br/>
        Job title: ${employee.role}<br/>
        Department: ${employee.department}<br/>
        Location: ${employee.location}<br/>
        Manager: ${employee.managerName}<br/>
        Start date: ${employee.startDate}
      </p>
      <p><strong>Required actions:</strong></p>
      <ul>
        <li>Review Personal Information</li>
        <li>Complete Induction Checklist</li>
        <li>Complete UOA Security Access Card Application</li>
        <li>Acknowledge First-Day Instructions</li>
      </ul>
      <p><a href="/oneflow/my-onboarding/${ALICIA_ONBOARDING_CASE_ID}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Open My Onboarding</a></p>
      <p style="margin-top:16px;padding:10px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
        📎 ${attachments.map((a) => a.fileName).join("<br/>📎 ")}<br/>
        Preview · Open and Complete Form · Download Mock Copy
      </p>
    </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    responsibleTeam: "HR Operations",
    attachments,
  };
}

export function buildAliciaDemoPackage(args: {
  checklistTemplates: AppStore["checklistTemplates"];
  assignmentRules: AppStore["assignmentRules"];
}): {
  employee: Employee;
  onboardingCase: OnboardingCase;
  inductionForm: InductionChecklistForm;
  accessCardForm: SecurityAccessCardApplication;
  laptopRequests: LaptopRequest[];
  tasks: ChecklistTask[];
  emails: MockEmail[];
  activity: ActivityHistory[];
  automationRuns: AutomationRun[];
} {
  const now = nowIso();
  const employee = createAliciaEmployee(now);
  const onboardingCase = createAliciaOnboardingCase(employee, now);

  const inductionDue = addWorkingDays(employee.startDate, -2)
    .toISOString()
    .slice(0, 10);
  const accessDue = addWorkingDays(employee.startDate, -5)
    .toISOString()
    .slice(0, 10);

  let inductionForm = createBlankInductionForm({
    id: ALICIA_INDUCTION_FORM_ID,
    lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
    lifecycleType: "Onboarding",
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    jobTitle: employee.role,
    department: employee.department,
    dueDate: inductionDue,
  });
  let accessCardForm = createBlankAccessCardForm({
    id: ALICIA_ACCESS_CARD_FORM_ID,
    lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
    lifecycleType: "Onboarding",
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    dueDate: accessDue,
  });

  const inductionTask = buildInductionEmployeeTask(
    employee,
    ALICIA_ONBOARDING_CASE_ID,
    ALICIA_INDUCTION_FORM_ID
  );
  const accessTask = buildAccessCardEmployeeTask(
    employee,
    ALICIA_ONBOARDING_CASE_ID,
    ALICIA_ACCESS_CARD_FORM_ID
  );
  const personalTask = buildPersonalInfoTask(employee, ALICIA_ONBOARDING_CASE_ID);
  const firstDayTask = buildFirstDayTask(employee, ALICIA_ONBOARDING_CASE_ID);

  inductionForm = {
    ...inductionForm,
    formStatus: "Sent",
    linkedEmployeeTaskId: inductionTask.id,
    formDueDate: inductionDue,
    updatedAt: now,
  };
  accessCardForm = {
    ...accessCardForm,
    formStatus: "Sent",
    linkedEmployeeTaskId: accessTask.id,
    formDueDate: accessDue,
    updatedAt: now,
  };

  const deptTasks = generateDeptTasks(
    employee,
    ALICIA_ONBOARDING_CASE_ID,
    args.checklistTemplates,
    args.assignmentRules
  );

  const welcome = buildAliciaWelcomeEmail(
    employee,
    ALICIA_INDUCTION_FORM_ID,
    ALICIA_ACCESS_CARD_FORM_ID
  );
  inductionForm = { ...inductionForm, initialEmailId: welcome.id };
  accessCardForm = { ...accessCardForm, initialEmailId: welcome.id };

  const inductionMail: MockEmail = {
    id: "mail-alicia-induction",
    automationRunId: "",
    from: "hr@ppg-demo.com",
    to: employee.email,
    cc: [],
    subject: "Action Required: Complete Your Induction Checklist",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${employee.fullName},</p>
      <p>Please complete your Induction Checklist before your start date.</p>
      <p>Due: ${inductionDue}</p>
      <p><a href="/oneflow/my-forms/induction/${ALICIA_INDUCTION_FORM_ID}">Open and Complete Form</a></p>
      <p>📎 Alicia_Wong_Induction_Checklist.pdf · Preview · Open and Complete Form · Download Mock Copy</p>
    </div>`,
    sentAt: now,
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    responsibleTeam: "HR Operations",
    attachments: [
      att(
        "Alicia_Wong_Induction_Checklist.pdf",
        "induction-checklist",
        ALICIA_INDUCTION_FORM_ID
      ),
    ],
  };

  const accessMail: MockEmail = {
    id: "mail-alicia-access",
    automationRunId: "",
    from: "administration@ppg-demo.com",
    to: employee.email,
    cc: [],
    subject: "Action Required: Complete Your UOA Security Access Card Application",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${employee.fullName},</p>
      <p>Please complete your UOA Security Access Card Application.</p>
      <p>Due: ${accessDue}</p>
      <p><a href="/oneflow/my-forms/access-card/${ALICIA_ACCESS_CARD_FORM_ID}">Open and Complete Form</a></p>
      <p>📎 Alicia_Wong_UOA_Security_Access_Card_Application.pdf · Preview · Open and Complete Form · Download Mock Copy</p>
    </div>`,
    sentAt: now,
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    responsibleTeam: "Administration",
    attachments: [
      att(
        "Alicia_Wong_UOA_Security_Access_Card_Application.pdf",
        "access-card-application",
        ALICIA_ACCESS_CARD_FORM_ID
      ),
    ],
  };

  const firstDayMail: MockEmail = {
    id: "mail-alicia-first-day",
    automationRunId: "",
    from: "hr@ppg-demo.com",
    to: employee.email,
    cc: [],
    subject: "Your First-Day Instructions at PPG",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${employee.fullName},</p>
      <p>Please review and acknowledge your first-day reporting instructions.</p>
      <p><a href="/oneflow/tasks/tsk-alicia-first-day">Open First-Day Instructions</a></p>
      <p>📎 Alicia_Wong_First_Day_Guide.pdf · Preview · Download Mock Copy</p>
    </div>`,
    sentAt: now,
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    responsibleTeam: "HR Operations",
    attachments: [
      att(
        "Alicia_Wong_First_Day_Guide.pdf",
        "first-day-guide",
        ALICIA_ONBOARDING_CASE_ID
      ),
    ],
  };

  const laptop = buildAliciaLaptopSeed(employee, ALICIA_ONBOARDING_CASE_ID);

  const activity: ActivityHistory[] = [
    {
      id: "act-alicia-welcome",
      employeeId: employee.id,
      onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
      timestamp: now,
      actor: "OneFlow Automation",
      action: "Welcome email sent",
      detail: `Onboarding case ${ALICIA_CASE_NUMBER} created · Welcome email sent to ${employee.email}`,
    },
    laptop.activity,
  ];

  return {
    employee,
    onboardingCase,
    inductionForm,
    accessCardForm,
    laptopRequests: [laptop.request] as LaptopRequest[],
    tasks: [
      personalTask,
      firstDayTask,
      inductionTask,
      accessTask,
      laptop.task,
      ...deptTasks,
    ],
    emails: [welcome, inductionMail, accessMail, firstDayMail, laptop.email],
    activity,
    automationRuns: [],
  };
}
