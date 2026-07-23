import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession, MockEmail } from "./auth-types";
import type { ChecklistTask, Employee } from "./types";
import type { MockEmailAttachment } from "./exit-clearance-types";
import type {
  InductionChecklistForm,
  InductionFormStatus,
  InductionSection,
} from "./induction-types";
import {
  INDUCTION_EMPLOYEE_TASK_TITLE,
  INDUCTION_REVIEW_TASK_TITLE,
} from "./induction-types";
import {
  createBlankInductionForm,
  fileNameForInduction,
  incompleteRequiredInductionSections,
} from "./induction-seed";
import { ensureInductionPresenterWorkflow } from "./induction-presenter-workflow";
import { migrateEmailAddress } from "./email-domain";
import {
  initReminderFieldsFromTemplate,
  stopAllReminders,
} from "./automation/reminder-engine";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function emailEq(a: string, b: string) {
  return migrateEmailAddress(a).toLowerCase() === migrateEmailAddress(b).toLowerCase();
}

export function canAccessInductionForm(
  session: UserSession,
  form: InductionChecklistForm
): boolean {
  if (session.role === "Admin" || session.role === "HR") return true;
  if (emailEq(session.email, form.employeeEmail)) return true;
  // Presenters assigned to a section on this form
  if (
    form.inductionSections.some((s) =>
      emailEq(s.assignedEmail || "", session.email)
    )
  ) {
    return true;
  }
  return false;
}

export function canReviewInductionForm(session: UserSession): boolean {
  return session.role === "Admin" || session.role === "HR";
}

function activity(
  employeeId: string,
  caseId: string,
  actor: string,
  action: string,
  detail: string
) {
  return {
    id: uid("act-ind"),
    employeeId,
    onboardingCaseId: caseId.startsWith("ob-") || caseId.includes("off") ? "" : caseId,
    offboardingCaseId:
      caseId.startsWith("ob-") || caseId.includes("off") ? caseId : null,
    timestamp: nowIso(),
    actor,
    action,
    detail,
  };
}

function buildEmployeeTask(args: {
  form: InductionChecklistForm;
  employee: Employee;
}): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 2,
      reminderFrequencyWorkingDays: 2,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 6,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: uid("tsk-ind-emp"),
    employeeId: args.employee.id,
    onboardingCaseId:
      args.form.lifecycleType === "Onboarding" ? args.form.lifecycleCaseId : "",
    offboardingCaseId:
      args.form.lifecycleType === "Offboarding" ? args.form.lifecycleCaseId : null,
    processType: args.form.lifecycleType,
    lifecycleCaseId: args.form.lifecycleCaseId,
    group: "HR Checklist",
    title: INDUCTION_EMPLOYEE_TASK_TITLE,
    description: "Complete the Induction Checklist for New Employees.",
    instructions: "Open the form, acknowledge induction sections, declare and submit.",
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
    dueDate: args.form.formDueDate || new Date().toISOString().slice(0, 10),
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
    sortOrder: 20,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Induction Checklist",
    sourceRecordId: args.form.id,
    linkedInductionFormId: args.form.id,
    isInductionEmployeeTask: true,
    ...reminder,
  };
}

function buildReviewTask(args: {
  form: InductionChecklistForm;
  employee: Employee;
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
    id: uid("tsk-ind-rev"),
    employeeId: args.employee.id,
    onboardingCaseId:
      args.form.lifecycleType === "Onboarding" ? args.form.lifecycleCaseId : "",
    offboardingCaseId:
      args.form.lifecycleType === "Offboarding" ? args.form.lifecycleCaseId : null,
    processType: args.form.lifecycleType,
    lifecycleCaseId: args.form.lifecycleCaseId,
    group: "HR Checklist",
    title: `${INDUCTION_REVIEW_TASK_TITLE} – ${args.employee.fullName}`,
    description: "Review the submitted Induction Checklist.",
    instructions: "Verify sections, complete presenter fields if needed, mark review complete.",
    status: "Pending",
    priority: "High",
    assignedOwner: "Amanda Lee",
    responsibleTeam: "HR Operations",
    assignedPersonName: "Amanda Lee",
    assignedEmail: "hr@ppg-demo.com",
    assignedUserName: "Amanda Lee",
    employeeName: args.employee.fullName,
    employeeEmail: args.employee.email,
    department: args.employee.department,
    dueDate: args.form.formDueDate || new Date().toISOString().slice(0, 10),
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
    sortOrder: 21,
    templateTaskId: null,
    taskType: "Review",
    outcome: "None",
    sourceType: "Induction Checklist",
    sourceRecordId: args.form.id,
    linkedInductionFormId: args.form.id,
    relatedFormType: "Induction Checklist",
    relatedFormId: args.form.id,
    isInductionReviewTask: true,
    ...reminder,
  };
}

function attachmentFor(form: InductionChecklistForm): MockEmailAttachment {
  return {
    id: uid("att-ind"),
    fileName: fileNameForInduction(form.employeeName),
    kind: "induction-checklist",
    formId: form.id,
    openedAt: null,
  };
}

export function assignInductionToEmployee(
  uow: UnitOfWork,
  session: UserSession,
  args: {
    employeeId: string;
    lifecycleCaseId: string;
    lifecycleType: "Onboarding" | "Offboarding";
    sendEmail?: boolean;
  }
) {
  if (session.role !== "Admin" && session.role !== "HR") {
    return { ok: false as const, error: "Not authorized." };
  }
  const employee = uow.employees.getById(args.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const existing = uow.inductionForms
    .list()
    .find(
      (f) =>
        f.employeeId === args.employeeId &&
        f.lifecycleCaseId === args.lifecycleCaseId &&
        f.formStatus !== "Completed"
    );
  if (existing) {
    return { ok: true as const, form: existing, created: false };
  }

  let form = createBlankInductionForm({
    lifecycleCaseId: args.lifecycleCaseId,
    lifecycleType: args.lifecycleType,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    jobTitle: employee.role,
    department: employee.department,
    dueDate: employee.startDate || employee.lastWorkingDate || null,
  });

  const task = buildEmployeeTask({ form, employee });
  form = {
    ...form,
    formStatus: "Sent",
    linkedEmployeeTaskId: task.id,
    updatedAt: nowIso(),
  };

  uow.tasks.createMany([task]);
  uow.inductionForms.create(form);

  // Create one presenter task per required section (idempotent)
  ensureInductionPresenterWorkflow(uow, form.id, {
    sendEmails: args.sendEmail !== false,
    actor: session.name,
  });

  if (args.sendEmail !== false) {
    const mail = buildInductionEmployeeEmail(form, "");
    form = { ...form, initialEmailId: mail.id };
    uow.inductionForms.update(form);
    uow.mockEmails.createMany([mail]);
  }

  uow.activity.create(
    activity(
      employee.id,
      args.lifecycleCaseId,
      session.name,
      "Induction Checklist assigned",
      `${INDUCTION_EMPLOYEE_TASK_TITLE} sent to ${employee.email}`
    )
  );
  uow.persist();
  return { ok: true as const, form, created: true };
}

export function buildInductionEmployeeEmail(
  form: InductionChecklistForm,
  runId: string
): MockEmail {
  const att = attachmentFor(form);
  return {
    id: uid("mail-ind"),
    automationRunId: runId,
    from: "hr@ppg-demo.com",
    to: form.employeeEmail,
    cc: [],
    subject: "Action Required: Complete Your Induction Checklist",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${form.employeeName},</p>
      <p>Please complete your <strong>Induction Checklist for New Employees</strong>.</p>
      <p>Job title: ${form.jobTitle}<br/>Department: ${form.department}<br/>Due: ${form.formDueDate || "ASAP"}</p>
      <p>Open the digital form in OneFlow to acknowledge each induction session and sign the declaration.</p>
      <p><a href="/oneflow/my-forms/induction/${form.id}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Open Form</a></p>
      <p style="margin-top:16px;padding:10px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
        📎 Attachment: ${att.fileName}<br/>
        <a href="/oneflow/my-forms/induction/${form.id}">Preview</a> ·
        <a href="/oneflow/my-forms/induction/${form.id}">Open and Complete Form</a> ·
        <a href="/oneflow/my-forms/induction/${form.id}?download=1">Download Mock Copy</a>
      </p>
    </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: form.employeeId,
    onboardingCaseId: form.lifecycleCaseId,
    responsibleTeam: "HR Operations",
    attachments: [att],
  };
}

export function openInductionForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  const form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (!canAccessInductionForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  const normalized = {
    ...form,
    acknowledgementDate: form.acknowledgementDate ?? null,
    hrReceivedDate: form.hrReceivedDate ?? null,
    hrRemarks: form.hrRemarks ?? "",
    inductionSections: form.inductionSections.map((s) => ({
      ...s,
      required: s.required !== false,
    })),
  };
  if (form.formStatus === "Sent") {
    const next = {
      ...normalized,
      formStatus: "Opened" as const,
      updatedAt: nowIso(),
    };
    uow.inductionForms.update(next);
    uow.persist();
    return { ok: true as const, form: next };
  }
  if (
    form.acknowledgementDate == null ||
    form.hrReceivedDate == null ||
    form.hrRemarks == null
  ) {
    uow.inductionForms.update(normalized);
  }
  return { ok: true as const, form: normalized };
}

export function saveInductionDraft(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch: {
    inductionSections?: InductionSection[];
    employeeDeclaration?: boolean;
    typedSignature?: string;
  }
) {
  const form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (!canAccessInductionForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  const locked = ["Submitted", "Under HR Review", "Completed"].includes(
    form.formStatus
  );
  if (locked && (session.role === "OFFBOARDING_EMPLOYEE" || session.role === "ONBOARDING_EMPLOYEE")) {
    return { ok: false as const, error: "Form is locked." };
  }

  let sections = form.inductionSections;
  if (patch.inductionSections) {
    if (session.role === "HR" || session.role === "Admin") {
      sections = patch.inductionSections;
    } else {
      // Employee may only update acknowledgement + remarks
      sections = form.inductionSections.map((s) => {
        const p = patch.inductionSections!.find((x) => x.id === s.id);
        if (!p) return s;
        return {
          ...s,
          employeeAcknowledged: p.employeeAcknowledged,
          remarks: p.remarks,
        };
      });
    }
  }

  let status: InductionFormStatus = form.formStatus;
  if (["Sent", "Opened", "Returned for Correction"].includes(form.formStatus)) {
    status = "Draft";
  }

  const next: InductionChecklistForm = {
    ...form,
    inductionSections: sections,
    employeeDeclaration:
      patch.employeeDeclaration ?? form.employeeDeclaration,
    typedSignature: patch.typedSignature ?? form.typedSignature,
    formStatus: status,
    updatedAt: nowIso(),
  };
  uow.inductionForms.update(next);
  uow.persist();
  return { ok: true as const, form: next };
}

export function submitInductionForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch?: {
    inductionSections?: InductionSection[];
    employeeDeclaration?: boolean;
    typedSignature?: string;
  }
) {
  const saved = patch
    ? saveInductionDraft(uow, session, formId, patch)
    : { ok: true as const, form: uow.inductionForms.getById(formId)! };
  if (!saved.ok) return saved;
  let form = saved.form;
  if (!canAccessInductionForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  if (!form.employeeDeclaration || !form.typedSignature.trim()) {
    return {
      ok: false as const,
      error: "Declaration and typed signature are required.",
    };
  }
  const incomplete = incompleteRequiredInductionSections(form);
  if (incomplete.length) {
    const uniqueNames = [...new Set(incomplete.map((s) => s.sectionName))];
    return {
      ok: false as const,
      error: `Required sessions remaining: ${uniqueNames.length}\n${uniqueNames
        .map((n) => `• ${n}`)
        .join("\n")}`,
    };
  }

  const employee = uow.employees.getById(form.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const reviewTask = buildReviewTask({ form, employee });
  form = {
    ...form,
    formStatus: "Under HR Review",
    employeeAcknowledged: true,
    employeeTypedSignature: form.typedSignature,
    employeeAcknowledgedAt: nowIso(),
    submittedAt: nowIso(),
    acknowledgementDate: nowIso().slice(0, 10),
    linkedReviewTaskId: reviewTask.id,
    updatedAt: nowIso(),
  };
  uow.inductionForms.update(form);
  uow.tasks.createMany([reviewTask]);

  if (form.linkedEmployeeTaskId) {
    const t = uow.tasks.getById(form.linkedEmployeeTaskId);
    if (t && t.status !== "Completed") {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Completed",
        outcome: "Completed",
        completedAt: nowIso(),
        completedBy: session.email,
        completedByName: session.name,
      });
    }
  }

  const hrMail: MockEmail = {
    id: uid("mail-ind-hr"),
    automationRunId: "",
    from: "oneflow@ppg-demo.com",
    to: "hr@ppg-demo.com",
    cc: [],
        subject: `Induction Checklist Submitted – ${form.employeeName}`,
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;">
      <p>${form.employeeName} submitted the Induction Checklist.</p>
      <p><a href="/oneflow/my-forms/induction/${form.id}">Open submitted form</a> ·
      <a href="/oneflow/my-forms/induction/${form.id}/preview?mode=submitted">Preview</a> ·
      <a href="/oneflow/tasks/${reviewTask.id}">Open review task</a></p>
      <p>📎 ${fileNameForInduction(form.employeeName)} (read-only)</p>
    </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: form.employeeId,
    onboardingCaseId: form.lifecycleCaseId,
    responsibleTeam: "HR Operations",
    attachments: [attachmentFor(form)],
  };
  uow.mockEmails.createMany([hrMail]);
  uow.activity.create(
    activity(
      form.employeeId,
      form.lifecycleCaseId,
      session.name,
      "Induction Checklist submitted",
      `Submitted · Review task created for HR`
    )
  );
  uow.persist();
  return { ok: true as const, form, reviewTaskId: reviewTask.id };
}

export function reviewInductionForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  args: {
    action: "Complete Review" | "Return for Correction";
    sections?: InductionSection[];
    remarks?: string;
  }
) {
  if (!canReviewInductionForm(session)) {
    return { ok: false as const, error: "Not authorized." };
  }
  let form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };

  if (args.sections) {
    form = { ...form, inductionSections: args.sections };
  }

  if (args.action === "Return for Correction") {
    if (!args.remarks?.trim()) {
      return { ok: false as const, error: "Correction reason is required." };
    }
    form = {
      ...form,
      formStatus: "Returned for Correction",
      updatedAt: nowIso(),
    };
    uow.inductionForms.update(form);
    if (form.linkedEmployeeTaskId) {
      const t = uow.tasks.getById(form.linkedEmployeeTaskId);
      if (t) {
        uow.tasks.update({
          ...t,
          status: "In Progress",
          completedAt: null,
          outcome: "None",
        });
      }
    }
    if (form.linkedReviewTaskId) {
      const t = uow.tasks.getById(form.linkedReviewTaskId);
      if (t) {
        uow.tasks.update({
          ...stopAllReminders(t),
          status: "Completed",
          outcome: "Returned for Correction",
          completedAt: nowIso(),
          completedBy: session.email,
          completedByName: session.name,
          remarks: args.remarks,
        });
      }
    }
    uow.mockEmails.createMany([
      {
        id: uid("mail-ind-corr"),
        automationRunId: "",
        from: "hr@ppg-demo.com",
        to: form.employeeEmail,
        cc: [],
        subject: "Action Required: Induction Checklist returned for correction",
        htmlBody: `<p>Hello ${form.employeeName},</p><p>Your Induction Checklist was returned for correction.</p><p>Reason: ${args.remarks}</p><p><a href="/oneflow/my-forms/induction/${form.id}">Open Form</a></p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: form.employeeId,
        onboardingCaseId: form.lifecycleCaseId,
        responsibleTeam: "HR Operations",
      },
    ]);
  } else {
    const presentersOk = form.inductionSections.every(
      (s) =>
        s.presenterSignatureStatus === "Signed" ||
        (s.completedOn && s.presenterName)
    );
    if (!presentersOk && session.role !== "Admin") {
      // Allow Admin override; HR should fill presenter fields
      // Soft-complete if employee acknowledged all
    }
    form = {
      ...form,
      formStatus: "Completed",
      reviewedAt: nowIso(),
      reviewedBy: session.name,
      hrReceivedDate: form.hrReceivedDate || nowIso().slice(0, 10),
      hrRemarks: args.remarks || form.hrRemarks || "",
      updatedAt: nowIso(),
    };
    uow.inductionForms.update(form);
    if (form.linkedReviewTaskId) {
      const t = uow.tasks.getById(form.linkedReviewTaskId);
      if (t) {
        uow.tasks.update({
          ...stopAllReminders(t),
          status: "Completed",
          outcome: "Reviewed",
          completedAt: nowIso(),
          completedBy: session.email,
          completedByName: session.name,
          remarks: args.remarks || "",
        });
      }
    }
    uow.mockEmails.createMany([
      {
        id: uid("mail-ind-done"),
        automationRunId: "",
        from: "hr@ppg-demo.com",
        to: form.employeeEmail,
        cc: [],
        subject: `Induction Checklist Completed – ${form.employeeName}`,
        htmlBody: `<p>Hello ${form.employeeName},</p><p>HR has completed the final review of your Induction Checklist.</p><p><a href="/oneflow/my-forms/induction/${form.id}">View form</a></p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: form.employeeId,
        onboardingCaseId: form.lifecycleCaseId,
        responsibleTeam: "HR Operations",
      },
    ]);
  }

  uow.activity.create(
    activity(
      form.employeeId,
      form.lifecycleCaseId,
      session.name,
      `Induction Checklist: ${args.action}`,
      args.remarks || form.formStatus
    )
  );
  uow.persist();
  return { ok: true as const, form };
}

export function populateInductionDemo(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  if (session.role !== "Admin") return { ok: false as const, error: "Admin only." };
  const form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };

  const presenters: Record<
    string,
    { name: string; initials: string; daysAgo: number; email: string }
  > = {
    "Human Resources Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 8,
      email: "admin@ppg-demo.com",
    },
    "Ethics and Compliance Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 7,
      email: "admin@ppg-demo.com",
    },
    "IT Induction": {
      name: "Onsite IT Support",
      initials: "IT",
      daysAgo: 6,
      email: "itsecurity@ppg-demo.com",
    },
    "EHS Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 5,
      email: "admin@ppg-demo.com",
    },
    "Finance and CONCUR Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 4,
      email: "admin@ppg-demo.com",
    },
    "Quality Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 3,
      email: "admin@ppg-demo.com",
    },
    "Product Stewardship Induction": {
      name: "Admin",
      initials: "OA",
      daysAgo: 2,
      email: "admin@ppg-demo.com",
    },
  };

  const today = new Date();
  const next: InductionChecklistForm = {
    ...form,
    inductionSections: form.inductionSections.map((s) => {
      const p = presenters[s.sectionName] || {
        name: "Admin",
        initials: "OA",
        daysAgo: 1,
        email: "admin@ppg-demo.com",
      };
      const d = new Date(today);
      d.setDate(d.getDate() - p.daysAgo);
      return {
        ...s,
        employeeAcknowledged: false,
        completedOn: d.toISOString().slice(0, 10),
        confirmedAt: d.toISOString(),
        presenterName: p.name,
        presenterEmail: p.email,
        assignedEmail: p.email,
        responsibleRole:
          s.sectionName === "IT Induction" ? "Onsite IT Support" : "Admin",
        presenterInitials: p.initials,
        presenterSignatureStatus: "Signed" as const,
        status: "Completed" as const,
        remarks: "Demo session completed",
        presenterRemarks: "Demo session completed",
        items: (s.items || []).map((it) => ({
          ...it,
          coverage: "Covered" as const,
        })),
      };
    }),
    // Leave Alicia's final declaration unsigned for demo Stage B
    employeeDeclaration: false,
    typedSignature: "",
    acknowledgementDate: null,
    formStatus: "Ready for Employee Acknowledgement",
    updatedAt: nowIso(),
  };
  uow.inductionForms.update(next);
  // Complete linked presenter tasks
  for (const s of next.inductionSections) {
    if (!s.linkedTaskId) continue;
    const t = uow.tasks.getById(s.linkedTaskId);
    if (t && t.status !== "Completed") {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Completed",
        outcome: "Completed",
        completedAt: nowIso(),
        completedByName: s.presenterName,
      });
    }
  }
  uow.activity.create(
    activity(
      form.employeeId,
      form.lifecycleCaseId,
      session.name,
      "Populate Completed Induction Sessions",
      "Demo-only: all required sessions marked complete · employee declaration left unsigned"
    )
  );
  uow.persist();
  return { ok: true as const, form: next };
}

export function resetInductionFormsForEmployee(
  uow: UnitOfWork,
  employeeId: string
) {
  const keep = uow.inductionForms.list().filter((f) => f.employeeId !== employeeId);
  const removeIds = new Set(
    uow.inductionForms.list().filter((f) => f.employeeId === employeeId).map((f) => f.id)
  );
  uow.inductionForms.replaceAll(keep);
  const tasks = uow.tasks
    .list()
    .filter(
      (t) =>
        !(
          t.employeeId === employeeId &&
          (t.isInductionEmployeeTask ||
            t.isInductionReviewTask ||
            (t.linkedInductionFormId && removeIds.has(t.linkedInductionFormId)))
        )
    );
  uow.tasks.replaceAll(tasks);
}
