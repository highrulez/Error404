import { addDays } from "./checklist";
import type { Employee, ChecklistTask, ActivityHistory } from "./types";
import type { MockEmail, AutomationRun } from "./auth-types";
import type { UnitOfWork } from "./repositories/interfaces";
import type {
  EmployeeExitClearanceForm,
  ExitClearanceChecklistItem,
  ExitClearanceTemplateItem,
  MockEmailAttachment,
} from "./exit-clearance-types";
import { initReminderFieldsFromTemplate } from "./automation/reminder-engine";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const EXIT_EMPLOYEE_TASK_TITLE = "Complete Employee Exit Clearance Form";
export const EXIT_WORKFLOW_TASK_TITLE = "Exit Clearance Form workflow";

const CONFIRMATION_TASK_TITLES: Record<string, string> = {
  Undertakings: "Confirm employee undertakings",
  "Outstanding Expense Report": "Confirm outstanding expense report",
  "Proprietary Information": "Confirm proprietary information returned",
  "Remove Employee from Approval Authority Listing":
    "Remove employee from approval authority listing",
  "Cash Advances / Loans": "Confirm cash advances or loans cleared",
  "Corporate Credit Card": "Confirm corporate credit card returned or cancelled",
  "Mobile Phone": "Confirm mobile phone returned",
  "SIM Card for Mobile Phone": "Confirm SIM card returned or cancelled",
  Keys: "Confirm keys returned",
  "Door Access Card": "Confirm access card returned or disabled",
};

function resolveAssignedEmail(
  tmpl: ExitClearanceTemplateItem,
  employee: Employee
): string {
  if (tmpl.assignmentEmailRule === "Employee Manager Email") {
    return employee.managerEmail || "manager@ppg-demo.com";
  }
  return tmpl.fixedAssignedEmail;
}

function mapRoleToTeam(role: string): ChecklistTask["responsibleTeam"] {
  switch (role) {
    case "HR Operations":
      return "HR Operations";
    case "Hiring Manager":
      return "Hiring Manager";
    case "Finance / Administration":
      return "Finance / Administration";
    case "Corporate Card Admin":
      return "Corporate Card Admin";
    case "Administration":
      return "Administration";
    default:
      return "HR Operations";
  }
}

export function snapshotExitFormFromTemplates(
  employee: Employee,
  caseId: string,
  templates: ExitClearanceTemplateItem[],
  options?: { formId?: string; formDueDate?: string }
): EmployeeExitClearanceForm {
  const lastWorkingDate =
    employee.lastWorkingDate || addDays(new Date().toISOString().slice(0, 10), 14);
  const formDueDate =
    options?.formDueDate || addDays(lastWorkingDate, -3);
  const active = [...templates]
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sequenceNumber - b.sequenceNumber);

  const items: ExitClearanceChecklistItem[] = active.map((tmpl) => ({
    id: uid("exit-item"),
    sequenceNumber: tmpl.sequenceNumber,
    title: tmpl.title,
    description: tmpl.description,
    employeeAnswer: "Not Selected",
    conditionalFields: tmpl.conditionalFields.map((f) => ({ ...f })),
    conditionalValues: {},
    confirmationDepartment: tmpl.confirmationDepartment,
    confirmationRole: tmpl.confirmationRole,
    confirmationAssignedEmail: resolveAssignedEmail(tmpl, employee),
    confirmationStatus: "Not Required",
    confirmationName: "",
    confirmationInitial: "",
    confirmationDate: null,
    confirmationRemarks: "",
    linkedTaskId: null,
    required: true,
    sortOrder: tmpl.sortOrder,
    alwaysRequiresConfirmation: tmpl.alwaysRequiresConfirmation,
    templateItemId: tmpl.id,
    unlockedForCorrection: false,
    confidentialRemarks: "",
  }));

  const ts = nowIso();
  return {
    id: options?.formId || uid("exit-form"),
    offboardingCaseId: caseId,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    employeeEmail: employee.email,
    personalEmail: "",
    contactNumber: employee.phone || "",
    department: employee.department,
    location: employee.location,
    managerName: employee.managerName,
    managerEmail: employee.managerEmail,
    lastWorkingDate,
    formDueDate,
    formStatus: "Not Sent",
    checklistItems: items,
    employeeDeclarationConfirmed: false,
    employeeTypedSignature: "",
    submittedAt: null,
    openedAt: null,
    reviewedAt: null,
    completedAt: null,
    createdAt: ts,
    updatedAt: ts,
    initialEmailId: null,
    completedEmailId: null,
  };
}

export function buildExitEmployeeTask(args: {
  employee: Employee;
  caseId: string;
  formId: string;
  dueDate: string;
}): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 5,
      escalationAfterWorkingDays: 3,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: uid("tsk-exit-emp"),
    employeeId: args.employee.id,
    onboardingCaseId: "",
    offboardingCaseId: args.caseId,
    processType: "Offboarding",
    group: "HR Checklist",
    title: EXIT_EMPLOYEE_TASK_TITLE,
    description:
      "Complete the digital Employee Exit Clearance Form sent to your OneFlow inbox.",
    instructions:
      "Open the Exit Clearance Form, complete all items, declare and submit.",
    status: "Pending",
    priority: "High",
    assignedOwner: args.employee.fullName,
    responsibleTeam: "HR Operations",
    assignedPersonName: args.employee.fullName,
    assignedEmail: args.employee.email,
    assignedUserName: args.employee.fullName,
    employeeName: args.employee.fullName,
    employeeEmail: args.employee.email,
    department: args.employee.department,
    lifecycleCaseId: args.caseId,
    dueDate: args.dueDate,
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
    sortOrder: 5,
    templateTaskId: null,
    exitFormId: args.formId,
    linkedExitClearanceFormId: args.formId,
    sourceType: "Exit Clearance Form",
    sourceRecordId: args.formId,
    taskType: "Action",
    outcome: "None",
    isExitClearanceEmployeeTask: true,
    ...reminder,
  };
}

export function itemNeedsConfirmation(item: ExitClearanceChecklistItem): boolean {
  if (item.alwaysRequiresConfirmation) return true;
  return item.employeeAnswer === "Yes";
}

export function buildConfirmationTasks(args: {
  form: EmployeeExitClearanceForm;
  employee: Employee;
}): { tasks: ChecklistTask[]; updatedItems: ExitClearanceChecklistItem[] } {
  const tasks: ChecklistTask[] = [];
  const updatedItems = args.form.checklistItems.map((item) => {
    if (!itemNeedsConfirmation(item)) {
      return {
        ...item,
        confirmationStatus: "Not Required" as const,
        linkedTaskId: null,
      };
    }
    if (item.linkedTaskId) {
      return { ...item, confirmationStatus: item.confirmationStatus === "Not Required" ? "Pending" : item.confirmationStatus };
    }
    const taskId = uid("tsk-exit-conf");
    const title =
      CONFIRMATION_TASK_TITLES[item.title] || `Confirm: ${item.title}`;
    const assignedAt = nowIso();
    const reminder = initReminderFieldsFromTemplate(
      {
        reminderEnabled: true,
        firstReminderAfterWorkingDays: 1,
        reminderFrequencyWorkingDays: 1,
        maximumReminderCount: 5,
        escalationAfterWorkingDays: 3,
        escalationEmailRule: "Admin",
        fixedEscalationEmail: "",
      },
      assignedAt,
      false
    );
    const team = mapRoleToTeam(item.confirmationRole);
    tasks.push({
      id: taskId,
      employeeId: args.employee.id,
      onboardingCaseId: "",
      offboardingCaseId: args.form.offboardingCaseId,
      processType: "Offboarding",
      lifecycleCaseId: args.form.offboardingCaseId,
      group:
        team === "Hiring Manager"
          ? "Hiring Manager Checklist"
          : team === "Finance / Administration" || team === "Corporate Card Admin"
            ? "Finance Checklist"
            : team === "Administration"
              ? "Facilities Checklist"
              : "HR Checklist",
      title,
      description: `Exit clearance confirmation for: ${item.title}`,
      instructions: `Verify the employee's answer for "${item.title}" and confirm or return for correction.`,
      status: "Pending",
      priority: "High",
      assignedOwner: item.confirmationRole,
      responsibleTeam: team,
      assignedPersonName: item.confirmationRole,
      assignedEmail: item.confirmationAssignedEmail,
      assignedUserName: item.confirmationRole,
      assignedTeam: team,
      responsibleRole: item.confirmationRole,
      employeeName: args.employee.fullName,
      employeeEmail: args.employee.email,
      department: args.employee.department,
      dueDate: args.form.lastWorkingDate,
      completedAt: null,
      notes: "",
      remarks: "",
      notificationStatus: "Pending",
      notificationSentAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      escalationStatus: "None",
      sourceSystem: "OneFlow",
      dependencyTaskIds: [],
      blockedReason: null,
      blocked: false,
      unlockedAt: assignedAt,
      required: true,
      sortOrder: item.sortOrder,
      templateTaskId: item.templateItemId,
      exitFormId: args.form.id,
      exitFormItemId: item.id,
      linkedExitClearanceFormId: args.form.id,
      linkedChecklistItemId: item.id,
      sourceType: "Exit Clearance Form",
      sourceRecordId: item.id,
      taskType: "Confirmation",
      outcome: "None",
      isExitClearanceConfirmation: true,
      ...reminder,
    });
    return {
      ...item,
      linkedTaskId: taskId,
      confirmationStatus: "Pending" as const,
    };
  });
  return { tasks, updatedItems };
}

export function buildInitialExitFormEmail(args: {
  form: EmployeeExitClearanceForm;
  runId: string;
}): MockEmail {
  const { form, runId } = args;
  const attachment: MockEmailAttachment = {
    id: uid("att"),
    fileName: `${form.employeeName.replace(/\s+/g, "_")}_Employee_Exit_Clearance_Form.pdf`,
    kind: "exit-clearance-blank",
    formId: form.id,
    openedAt: null,
  };
  return {
    id: uid("mail-exit"),
    automationRunId: runId,
    from: "oneflow.offboarding@ppg-demo.com",
    to: form.employeeEmail,
    cc: ["hr@ppg-demo.com", "admin@ppg-demo.com"],
    subject: "Action Required: Complete Your Employee Exit Clearance Form",
    htmlBody: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
        <p>Hello ${form.employeeName},</p>
        <p>Please complete your <strong>Employee Exit Clearance Form</strong> before your last working day.</p>
        <table style="border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:4px 8px;color:#6b7280;">Employee</td><td style="padding:4px 8px;font-weight:600;">${form.employeeName}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Employee ID</td><td style="padding:4px 8px;">${form.employeeNumber}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Department</td><td style="padding:4px 8px;">${form.department}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Manager</td><td style="padding:4px 8px;">${form.managerName}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Last working date</td><td style="padding:4px 8px;">${form.lastWorkingDate}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Form due date</td><td style="padding:4px 8px;">${form.formDueDate}</td></tr>
        </table>
        <p>Instructions: Open the form, answer Yes/No for each clearance item, complete conditional details where applicable, sign the declaration, and submit.</p>
        <p style="margin-top:20px;"><a href="/oneflow/exit-clearance/${form.id}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Complete Exit Clearance Form</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
      </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: form.employeeId,
    onboardingCaseId: form.offboardingCaseId,
    responsibleTeam: "HR Operations",
    attachments: [attachment],
  };
}

export function buildDepartmentConfirmationEmails(args: {
  form: EmployeeExitClearanceForm;
  tasks: ChecklistTask[];
  runId: string;
}): MockEmail[] {
  const byEmail = new Map<string, ChecklistTask[]>();
  for (const t of args.tasks) {
    const list = byEmail.get(t.assignedEmail) || [];
    list.push(t);
    byEmail.set(t.assignedEmail, list);
  }
  const emails: MockEmail[] = [];
  for (const [to, tasks] of byEmail) {
    const rows = tasks
      .map(
        (t) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.title}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${t.dueDate}</td></tr>`
      )
      .join("");
    emails.push({
      id: uid("mail-exit-conf"),
      automationRunId: args.runId,
      from: "oneflow.offboarding@ppg-demo.com",
      to,
      cc: ["hr@ppg-demo.com", "admin@ppg-demo.com"],
      subject: `OneFlow: Exit clearance confirmation required — ${args.form.employeeName}`,
      htmlBody: `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
          <p>Exit clearance items require your confirmation for <strong>${args.form.employeeName}</strong> (${args.form.employeeNumber}).</p>
          <p>Last working date: <strong>${args.form.lastWorkingDate}</strong></p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
            <thead><tr style="background:#f3f4f6;text-align:left;"><th style="padding:6px 8px;">Task</th><th style="padding:6px 8px;">Due</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:20px;"><a href="/oneflow/my-tasks" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Open My Assigned Tasks</a></p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
        </div>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: args.form.employeeId,
      onboardingCaseId: args.form.offboardingCaseId,
      responsibleTeam: tasks[0]?.responsibleTeam || "HR Operations",
    });
  }
  return emails;
}

export function buildCompletedExitFormEmail(args: {
  form: EmployeeExitClearanceForm;
  runId: string;
}): MockEmail {
  const attachment: MockEmailAttachment = {
    id: uid("att"),
    fileName: `${args.form.employeeName.replace(/\s+/g, "_")}_Completed_Employee_Exit_Clearance_Form.pdf`,
    kind: "exit-clearance-completed",
    formId: args.form.id,
    openedAt: null,
  };
  return {
    id: uid("mail-exit-done"),
    automationRunId: args.runId,
    from: "oneflow.offboarding@ppg-demo.com",
    to: args.form.employeeEmail,
    cc: ["hr@ppg-demo.com", args.form.managerEmail].filter(Boolean),
    subject: "Employee Exit Clearance Completed",
    htmlBody: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.5;">
        <p>Hello ${args.form.employeeName},</p>
        <p>All required departments have completed your Employee Exit Clearance.</p>
        <table style="border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:4px 8px;color:#6b7280;">Employee</td><td style="padding:4px 8px;font-weight:600;">${args.form.employeeName}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Employee ID</td><td style="padding:4px 8px;">${args.form.employeeNumber}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Last working date</td><td style="padding:4px 8px;">${args.form.lastWorkingDate}</td></tr>
          <tr><td style="padding:4px 8px;color:#6b7280;">Clearance completion date</td><td style="padding:4px 8px;">${args.form.completedAt || nowIso().slice(0, 10)}</td></tr>
        </table>
        <p style="margin-top:20px;"><a href="/oneflow/exit-clearance/${args.form.id}/print?mode=completed" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">View Completed Form</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Prototype mock email — not delivered via Outlook.</p>
      </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: args.form.employeeId,
    onboardingCaseId: args.form.offboardingCaseId,
    responsibleTeam: "HR Operations",
    attachments: [attachment],
  };
}

export function calculateExitFormProgress(form: EmployeeExitClearanceForm): {
  employeeSubmission: "Not Started" | "In Progress" | "Submitted";
  requiredConfirmations: number;
  confirmedCount: number;
  clearedCount: number;
  percent: number;
  pendingDepartments: string[];
  correctionItems: number;
  rejectedItems: number;
} {
  const submittedStatuses = new Set([
    "Submitted",
    "Confirmation In Progress",
    "Returned for Correction",
    "Fully Cleared",
    "Completed",
  ]);
  let employeeSubmission: "Not Started" | "In Progress" | "Submitted" =
    "Not Started";
  if (submittedStatuses.has(form.formStatus)) employeeSubmission = "Submitted";
  else if (
    form.formStatus === "Opened" ||
    form.formStatus === "Draft" ||
    form.formStatus === "Sent"
  ) {
    employeeSubmission = "In Progress";
  }

  const items = form.checklistItems;
  const cleared = items.filter(
    (i) =>
      i.confirmationStatus === "Confirmed" ||
      i.confirmationStatus === "Not Required"
  );
  const needConf = items.filter(
    (i) =>
      submittedStatuses.has(form.formStatus) &&
      i.confirmationStatus !== "Not Required"
  );
  const confirmedCount = items.filter(
    (i) => i.confirmationStatus === "Confirmed"
  ).length;
  const clearedCount = cleared.length;
  const total = items.length || 1;
  const percent =
    employeeSubmission !== "Submitted"
      ? Math.min(Math.round((clearedCount / total) * 40), 40)
      : Math.round((clearedCount / total) * 100);

  const pendingDepartments = [
    ...new Set(
      needConf
        .filter(
          (i) =>
            i.confirmationStatus !== "Confirmed" &&
            i.confirmationStatus !== "Not Required"
        )
        .map((i) => i.confirmationDepartment)
    ),
  ];
  return {
    employeeSubmission,
    requiredConfirmations: needConf.length,
    confirmedCount,
    clearedCount,
    percent,
    pendingDepartments,
    correctionItems: form.checklistItems.filter(
      (i) => i.confirmationStatus === "Returned for Correction"
    ).length,
    rejectedItems: form.checklistItems.filter(
      (i) => i.confirmationStatus === "Rejected"
    ).length,
  };
}

export function allRequiredConfirmationsDone(
  form: EmployeeExitClearanceForm
): boolean {
  if (!form.checklistItems.length) return false;
  return form.checklistItems.every(
    (i) =>
      i.confirmationStatus === "Confirmed" ||
      i.confirmationStatus === "Not Required"
  );
}

export function validateExitFormForSubmit(
  form: EmployeeExitClearanceForm
): string | null {
  if (!form.personalEmail.trim()) return "Personal email is required.";
  if (!form.contactNumber.trim()) return "Contact number is required.";
  for (const item of form.checklistItems) {
    if (item.employeeAnswer === "Not Selected") {
      return `Please answer Yes or No for: ${item.title}`;
    }
    if (item.employeeAnswer === "Yes") {
      for (const field of item.conditionalFields) {
        if (!field.required) continue;
        const val = (item.conditionalValues[field.key] || "").trim();
        if (!val) return `${item.title}: ${field.label} is required.`;
      }
    }
  }
  if (!form.employeeDeclarationConfirmed) {
    return "Please confirm the employee declaration.";
  }
  if (!form.employeeTypedSignature.trim()) {
    return "Typed signature is required.";
  }
  return null;
}

export function recordExitAutomationRun(args: {
  uow: UnitOfWork;
  employee: Employee;
  caseId: string;
  trigger: string;
  taskCount: number;
  emailCount: number;
}): string {
  const runId = uid("run-exit");
  const started = nowIso();
  const run: AutomationRun = {
    id: runId,
    runNumber: `EXIT-${Date.now().toString(36).toUpperCase()}`,
    trigger: args.trigger,
    employeeId: args.employee.id,
    onboardingCaseId: args.caseId,
    status: "Successful",
    startedAt: started,
    endedAt: nowIso(),
    durationMs: 60,
    tasksAssigned: args.taskCount,
    emailsGenerated: args.emailCount,
    errorMessage: null,
    simulateFailure: false,
    steps: [
      {
        id: uid("step"),
        order: 1,
        name: args.trigger,
        status: "Successful",
        detail: `${args.taskCount} task(s), ${args.emailCount} email(s)`,
        startedAt: started,
        completedAt: nowIso(),
      },
    ],
  };
  args.uow.automationRuns.create(run);
  return runId;
}

export function exitActivity(
  employeeId: string,
  caseId: string,
  actor: string,
  action: string,
  detail: string
): ActivityHistory {
  return {
    id: uid("act"),
    employeeId,
    onboardingCaseId: "",
    offboardingCaseId: caseId,
    timestamp: nowIso(),
    actor,
    action,
    detail,
  };
}

export function applySampleAnswers(
  form: EmployeeExitClearanceForm
): EmployeeExitClearanceForm {
  const items = form.checklistItems.map((item) => ({ ...item, conditionalValues: { ...item.conditionalValues } }));
  const set = (
    title: string,
    answer: "Yes" | "No",
    values: Record<string, string> = {}
  ) => {
    const item = items.find((i) => i.title === title);
    if (!item) return;
    item.employeeAnswer = answer;
    item.conditionalValues = values;
  };
  set("Undertakings", "No");
  set("Outstanding Expense Report", "Yes");
  set("Proprietary Information", "Yes");
  set("Remove Employee from Approval Authority Listing", "Yes");
  set("Cash Advances / Loans", "No");
  set("Corporate Credit Card", "Yes");
  set("Mobile Phone", "Yes", {
    mobilePhoneModel: "Samsung Galaxy S23",
    assetTag: "MY-MOB-00881",
    condition: "Good",
  });
  set("SIM Card for Mobile Phone", "Yes", {
    mobileNumber: "+60 12-345 6789",
    condition: "Good",
  });
  set("Keys", "Yes", {
    doorKeys: "1",
    cabinetKeys: "2",
    toiletKeys: "0",
    officeKeys: "1",
  });
  set("Door Access Card", "Yes", {
    accessCardNumber: "AC-12088",
    returnDate: form.lastWorkingDate,
    condition: "Good",
  });
  return {
    ...form,
    personalEmail: "daniel.lim.personal@example.com",
    contactNumber: "+60 12-345 6789",
    employeeDeclarationConfirmed: true,
    employeeTypedSignature: "Daniel Lim",
    checklistItems: items,
    updatedAt: nowIso(),
  };
}
