import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession, MockEmail } from "./auth-types";
import type { ChecklistTask, Employee } from "./types";
import type { MockEmailAttachment } from "./exit-clearance-types";
import type {
  AccessCardFormStatus,
  AccessCardOfficeUse,
  SecurityAccessCardApplication,
} from "./access-card-types";
import {
  ACCESS_CARD_EMPLOYEE_TASK_TITLE,
  ACCESS_CARD_REVIEW_TASK_TITLE_PREFIX,
} from "./access-card-types";
import {
  createBlankAccessCardForm,
  DEMO_PHOTO_DATA_URL,
  fileNameForAccessCard,
} from "./access-card-seed";
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
  return (
    migrateEmailAddress(a).toLowerCase() ===
    migrateEmailAddress(b).toLowerCase()
  );
}

export function canAccessAccessCardForm(
  session: UserSession,
  form: SecurityAccessCardApplication
): boolean {
  if (session.role === "Admin" || session.role === "ADMINISTRATION") return true;
  return emailEq(session.email, form.employeeEmail);
}

export function canReviewAccessCardForm(session: UserSession): boolean {
  return session.role === "Admin" || session.role === "ADMINISTRATION";
}

function activity(
  employeeId: string,
  caseId: string,
  actor: string,
  action: string,
  detail: string
) {
  return {
    id: uid("act-acc"),
    employeeId,
    onboardingCaseId: caseId.includes("off") ? "" : caseId,
    offboardingCaseId: caseId.includes("off") ? caseId : null,
    timestamp: nowIso(),
    actor,
    action,
    detail,
  };
}

function buildEmployeeTask(args: {
  form: SecurityAccessCardApplication;
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
    id: uid("tsk-acc-emp"),
    employeeId: args.employee.id,
    onboardingCaseId:
      args.form.lifecycleType === "Onboarding" ? args.form.lifecycleCaseId : "",
    offboardingCaseId:
      args.form.lifecycleType === "Offboarding"
        ? args.form.lifecycleCaseId
        : null,
    processType: args.form.lifecycleType,
    lifecycleCaseId: args.form.lifecycleCaseId,
    group: "Facilities Checklist",
    title: ACCESS_CARD_EMPLOYEE_TASK_TITLE,
    description: "Complete the UOA Security Access Card Application.",
    instructions: "Fill applicant details, attach photo, declare and submit.",
    status: "Pending",
    priority: "High",
    assignedOwner: args.employee.fullName,
    responsibleTeam: "Administration",
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
    sortOrder: 22,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Access Card Application",
    sourceRecordId: args.form.id,
    linkedAccessCardFormId: args.form.id,
    isAccessCardEmployeeTask: true,
    ...reminder,
  };
}

function buildReviewTask(args: {
  form: SecurityAccessCardApplication;
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
    id: uid("tsk-acc-rev"),
    employeeId: args.employee.id,
    onboardingCaseId:
      args.form.lifecycleType === "Onboarding" ? args.form.lifecycleCaseId : "",
    offboardingCaseId:
      args.form.lifecycleType === "Offboarding"
        ? args.form.lifecycleCaseId
        : null,
    processType: args.form.lifecycleType,
    lifecycleCaseId: args.form.lifecycleCaseId,
    group: "Facilities Checklist",
    title: `${ACCESS_CARD_REVIEW_TASK_TITLE_PREFIX} – ${args.employee.fullName}`,
    description: "Review the UOA Security Access Card Application.",
    instructions:
      "Verify details, enter office-use fields, approve or issue card.",
    status: "Pending",
    priority: "High",
    assignedOwner: "Priya Nair",
    responsibleTeam: "Administration",
    assignedPersonName: "Priya Nair",
    assignedEmail: "administration@ppg-demo.com",
    assignedUserName: "Priya Nair",
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
    sortOrder: 23,
    templateTaskId: null,
    taskType: "Review",
    outcome: "None",
    sourceType: "Access Card Application",
    sourceRecordId: args.form.id,
    linkedAccessCardFormId: args.form.id,
    isAccessCardReviewTask: true,
    ...reminder,
  };
}

function attachmentFor(
  form: SecurityAccessCardApplication
): MockEmailAttachment {
  return {
    id: uid("att-acc"),
    fileName: fileNameForAccessCard(form.employeeName),
    kind: "access-card-application",
    formId: form.id,
    openedAt: null,
  };
}

export type AccessCardEmployeePatch = {
  companyNameOnCard?: string;
  locationUnit?: string;
  applicantName?: string;
  gender?: SecurityAccessCardApplication["gender"];
  officeTelephone?: string;
  mobileTelephone?: string;
  nameOnCard?: string;
  identityDocumentType?: SecurityAccessCardApplication["identityDocumentType"];
  identityDocumentNumber?: string;
  photoAttachmentId?: string | null;
  photoDataUrl?: string | null;
  employeeDeclarationConfirmed?: boolean;
  employeeTypedSignature?: string;
};

export function assignAccessCardToEmployee(
  uow: UnitOfWork,
  session: UserSession,
  args: {
    employeeId: string;
    lifecycleCaseId: string;
    lifecycleType: "Onboarding" | "Offboarding";
    sendEmail?: boolean;
  }
) {
  if (session.role !== "Admin" && session.role !== "ADMINISTRATION") {
    return { ok: false as const, error: "Not authorized." };
  }
  const employee = uow.employees.getById(args.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const existing = uow.accessCardForms
    .list()
    .find(
      (f) =>
        f.employeeId === args.employeeId &&
        f.lifecycleCaseId === args.lifecycleCaseId &&
        !["Completed", "Card Issued"].includes(f.formStatus)
    );
  if (existing) return { ok: true as const, form: existing, created: false };

  let form = createBlankAccessCardForm({
    lifecycleCaseId: args.lifecycleCaseId,
    lifecycleType: args.lifecycleType,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
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
  uow.accessCardForms.create(form);

  if (args.sendEmail !== false) {
    const mail = buildAccessCardEmployeeEmail(form);
    form = { ...form, initialEmailId: mail.id };
    uow.accessCardForms.update(form);
    uow.mockEmails.createMany([mail]);
  }

  uow.activity.create(
    activity(
      employee.id,
      args.lifecycleCaseId,
      session.name,
      "Access Card Application assigned",
      `${ACCESS_CARD_EMPLOYEE_TASK_TITLE} sent to ${employee.email}`
    )
  );
  uow.persist();
  return { ok: true as const, form, created: true };
}

export function buildAccessCardEmployeeEmail(
  form: SecurityAccessCardApplication
): MockEmail {
  const att = attachmentFor(form);
  return {
    id: uid("mail-acc"),
    automationRunId: "",
    from: "administration@ppg-demo.com",
    to: form.employeeEmail,
    cc: [],
    subject:
      "Action Required: Complete Your UOA Security Access Card Application",
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${form.employeeName},</p>
      <p>Please complete your <strong>UOA Security Access Card Application</strong>.</p>
      <p>Due: ${form.formDueDate || "ASAP"}</p>
      <p><a href="/oneflow/my-forms/access-card/${form.id}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Open Form</a></p>
      <p style="margin-top:16px;padding:10px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
        📎 Attachment: ${att.fileName}<br/>
        <a href="/oneflow/my-forms/access-card/${form.id}">Preview</a> ·
        <a href="/oneflow/my-forms/access-card/${form.id}">Open and Complete Form</a> ·
        <a href="/oneflow/my-forms/access-card/${form.id}?download=1">Download Mock Copy</a>
      </p>
    </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: form.employeeId,
    onboardingCaseId: form.lifecycleCaseId,
    responsibleTeam: "Administration",
    attachments: [att],
  };
}

export function openAccessCardForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  const form = uow.accessCardForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (!canAccessAccessCardForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  if (form.formStatus === "Sent") {
    const next = {
      ...form,
      formStatus: "Opened" as const,
      updatedAt: nowIso(),
    };
    uow.accessCardForms.update(next);
    uow.persist();
    return { ok: true as const, form: next };
  }
  return { ok: true as const, form };
}

export function saveAccessCardDraft(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch: AccessCardEmployeePatch
) {
  const form = uow.accessCardForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (!canAccessAccessCardForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  const locked = [
    "Submitted",
    "Under Administration Review",
    "Approved",
    "Card Issued",
    "Completed",
  ].includes(form.formStatus);
  if (
    locked &&
    session.role !== "Admin" &&
    session.role !== "ADMINISTRATION"
  ) {
    return { ok: false as const, error: "Form is locked." };
  }

  const isEmployee =
    session.role === "OFFBOARDING_EMPLOYEE" ||
    session.role === "ONBOARDING_EMPLOYEE" ||
    emailEq(session.email, form.employeeEmail);

  if (isEmployee && locked) {
    return { ok: false as const, error: "Form is locked." };
  }

  let status: AccessCardFormStatus = form.formStatus;
  if (["Sent", "Opened", "Returned for Correction"].includes(form.formStatus)) {
    status = "Draft";
  }

  const company = (patch.companyNameOnCard ?? form.companyNameOnCard).slice(
    0,
    12
  );
  const nameOnCard = (patch.nameOnCard ?? form.nameOnCard).slice(0, 12);

  const next: SecurityAccessCardApplication = {
    ...form,
    companyNameOnCard: company,
    locationUnit: patch.locationUnit ?? form.locationUnit,
    applicantName: patch.applicantName ?? form.applicantName,
    gender: patch.gender ?? form.gender,
    officeTelephone: patch.officeTelephone ?? form.officeTelephone,
    mobileTelephone: patch.mobileTelephone ?? form.mobileTelephone,
    nameOnCard,
    identityDocumentType:
      patch.identityDocumentType ?? form.identityDocumentType,
    identityDocumentNumber:
      patch.identityDocumentNumber ?? form.identityDocumentNumber,
    photoAttachmentId:
      patch.photoAttachmentId !== undefined
        ? patch.photoAttachmentId
        : form.photoAttachmentId,
    photoDataUrl:
      patch.photoDataUrl !== undefined ? patch.photoDataUrl : form.photoDataUrl,
    employeeDeclarationConfirmed:
      patch.employeeDeclarationConfirmed ?? form.employeeDeclarationConfirmed,
    employeeTypedSignature:
      patch.employeeTypedSignature ?? form.employeeTypedSignature,
    formStatus: status,
    updatedAt: nowIso(),
  };
  uow.accessCardForms.update(next);
  uow.persist();
  return { ok: true as const, form: next };
}

export function validateAccessCardForSubmit(
  form: SecurityAccessCardApplication
): string | null {
  if (!form.companyNameOnCard.trim()) return "Company name is required.";
  if (form.companyNameOnCard.length > 12)
    return "Company name max 12 characters.";
  if (!form.locationUnit.trim()) return "Location / unit is required.";
  if (!form.applicantName.trim()) return "Applicant name is required.";
  if (!form.gender) return "Gender is required.";
  if (!form.mobileTelephone.trim()) return "Handphone number is required.";
  if (!form.nameOnCard.trim()) return "Name on card is required.";
  if (form.nameOnCard.length > 12) return "Name on card max 12 characters.";
  if (!/^[A-Za-z0-9 .'\-]*$/.test(form.nameOnCard)) {
    return "Name on card contains unsupported characters.";
  }
  if (!form.identityDocumentType || !form.identityDocumentNumber.trim()) {
    return "Identity document is required.";
  }
  if (!form.photoDataUrl && !form.photoAttachmentId) {
    return "Photo is required for final submission.";
  }
  if (!form.employeeDeclarationConfirmed) return "Declaration is required.";
  if (!form.employeeTypedSignature.trim())
    return "Typed signature is required.";
  return null;
}

export function submitAccessCardForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch?: AccessCardEmployeePatch
) {
  if (patch) {
    const saved = saveAccessCardDraft(uow, session, formId, patch);
    if (!saved.ok) return saved;
  }
  let form = uow.accessCardForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (!canAccessAccessCardForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  const err = validateAccessCardForSubmit(form);
  if (err) return { ok: false as const, error: err };

  const employee = uow.employees.getById(form.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const reviewTask = buildReviewTask({ form, employee });
  form = {
    ...form,
    formStatus: "Submitted",
    submittedAt: nowIso(),
    linkedReviewTaskId: reviewTask.id,
    updatedAt: nowIso(),
  };
  uow.accessCardForms.update(form);
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

  uow.mockEmails.createMany([
    {
      id: uid("mail-acc-admin"),
      automationRunId: "",
      from: "oneflow@ppg-demo.com",
      to: "administration@ppg-demo.com",
      cc: [],
      subject: `Security Access Card Application Submitted – ${form.employeeName}`,
      htmlBody: `<p>${form.employeeName} submitted a Security Access Card Application.</p>
        <p><a href="/oneflow/my-forms/access-card/${form.id}">Open form</a> ·
        <a href="/oneflow/tasks/${reviewTask.id}">Open review task</a></p>
        <p>📎 ${fileNameForAccessCard(form.employeeName)}</p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: form.employeeId,
      onboardingCaseId: form.lifecycleCaseId,
      responsibleTeam: "Administration",
      attachments: [attachmentFor(form)],
    },
  ]);
  uow.activity.create(
    activity(
      form.employeeId,
      form.lifecycleCaseId,
      session.name,
      "Access Card Application submitted",
      "Submitted · Review task created for Administration"
    )
  );
  uow.persist();
  return { ok: true as const, form, reviewTaskId: reviewTask.id };
}

export function reviewAccessCardForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  args: {
    action: "Approve" | "Return for Correction" | "Mark Card Issued";
    officeUseOnly?: Partial<AccessCardOfficeUse>;
    remarks?: string;
  }
) {
  if (!canReviewAccessCardForm(session)) {
    return { ok: false as const, error: "Not authorized." };
  }
  let form = uow.accessCardForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };

  if (args.officeUseOnly) {
    form = {
      ...form,
      officeUseOnly: { ...form.officeUseOnly, ...args.officeUseOnly },
    };
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
    uow.accessCardForms.update(form);
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
    uow.mockEmails.createMany([
      {
        id: uid("mail-acc-corr"),
        automationRunId: "",
        from: "administration@ppg-demo.com",
        to: form.employeeEmail,
        cc: [],
        subject:
          "Action Required: Access Card Application returned for correction",
        htmlBody: `<p>Hello ${form.employeeName},</p><p>Reason: ${args.remarks}</p><p><a href="/oneflow/my-forms/access-card/${form.id}">Open Form</a></p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: form.employeeId,
        onboardingCaseId: form.lifecycleCaseId,
        responsibleTeam: "Administration",
      },
    ]);
  } else if (args.action === "Approve") {
    form = {
      ...form,
      formStatus: "Approved",
      reviewedAt: nowIso(),
      reviewedBy: session.name,
      updatedAt: nowIso(),
    };
    uow.accessCardForms.update(form);
  } else {
    form = {
      ...form,
      formStatus: "Card Issued",
      reviewedAt: form.reviewedAt || nowIso(),
      reviewedBy: form.reviewedBy || session.name,
      updatedAt: nowIso(),
    };
    uow.accessCardForms.update(form);
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
          remarks: args.remarks || "Card issued",
        });
      }
    }
    uow.mockEmails.createMany([
      {
        id: uid("mail-acc-issued"),
        automationRunId: "",
        from: "administration@ppg-demo.com",
        to: form.employeeEmail,
        cc: [],
        subject: "Your UOA Security Access Card has been issued",
        htmlBody: `<p>Hello ${form.employeeName},</p>
          <p>Your security access card has been issued.</p>
          <p>Card number: ${form.officeUseOnly.cardNumber || "—"}</p>
          <p>Activation: ${form.officeUseOnly.activationDate || "—"} · Expiry: ${form.officeUseOnly.expiryDate || "—"}</p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: form.employeeId,
        onboardingCaseId: form.lifecycleCaseId,
        responsibleTeam: "Administration",
      },
    ]);
  }

  uow.activity.create(
    activity(
      form.employeeId,
      form.lifecycleCaseId,
      session.name,
      `Access Card: ${args.action}`,
      args.remarks || form.formStatus
    )
  );
  uow.persist();
  return { ok: true as const, form };
}

export function populateAccessCardDemo(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  if (session.role !== "Admin")
    return { ok: false as const, error: "Admin only." };
  const form = uow.accessCardForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  const next: SecurityAccessCardApplication = {
    ...form,
    companyNameOnCard: "PPG",
    locationUnit: form.locationUnit || "L6-1",
    applicantName: form.employeeName,
    gender: form.employeeName.toLowerCase().includes("alicia")
      ? "Female"
      : form.gender || "Male",
    officeTelephone: form.officeTelephone || "+60 3-7956 6600",
    mobileTelephone: form.mobileTelephone || "+60 12-987 6543",
    nameOnCard: form.employeeName.split(/\s+/).slice(0, 2).join(" ").slice(0, 12),
    identityDocumentType: "NRIC",
    identityDocumentNumber:
      form.identityDocumentNumber || "920515-14-1234",
    photoAttachmentId: "demo-photo",
    photoDataUrl: DEMO_PHOTO_DATA_URL,
    employeeDeclarationConfirmed: true,
    employeeTypedSignature: form.employeeName,
    formStatus: form.formStatus === "Sent" ? "Draft" : form.formStatus,
    updatedAt: nowIso(),
  };
  uow.accessCardForms.update(next);
  uow.persist();
  return { ok: true as const, form: next };
}

export function resetAccessCardFormsForEmployee(
  uow: UnitOfWork,
  employeeId: string
) {
  const keep = uow.accessCardForms
    .list()
    .filter((f) => f.employeeId !== employeeId);
  const removeIds = new Set(
    uow.accessCardForms
      .list()
      .filter((f) => f.employeeId === employeeId)
      .map((f) => f.id)
  );
  uow.accessCardForms.replaceAll(keep);
  const tasks = uow.tasks
    .list()
    .filter(
      (t) =>
        !(
          t.employeeId === employeeId &&
          (t.isAccessCardEmployeeTask ||
            t.isAccessCardReviewTask ||
            (t.linkedAccessCardFormId &&
              removeIds.has(t.linkedAccessCardFormId)))
        )
    );
  uow.tasks.replaceAll(tasks);
}

export { DEMO_PHOTO_DATA_URL };
