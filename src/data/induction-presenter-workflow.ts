/**
 * Induction presenter-section workflow:
 * one Action task per required section, completion updates the form section.
 */

import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import type { ChecklistTask, Employee } from "./types";
import type {
  InductionChecklistForm,
  InductionSection,
} from "./induction-types";
import {
  INDUCTION_REVIEW_TASK_TITLE,
  isSectionCleared,
  isSectionRequired,
  resolveInductionSectionId,
} from "./induction-types";
import {
  buildDefaultInductionSections,
  dedupeInductionSections,
  deriveInductionFormStatus,
  getInductionSectionDefinition,
  incompleteRequiredInductionSections,
  inductionSectionProgress,
} from "./induction-seed";
import { initReminderFieldsFromTemplate, stopAllReminders } from "./automation/reminder-engine";
import { addWorkingDays } from "./working-days";
import { profileByEmail, initialsFromName } from "./demo-profiles";
import { migrateEmailAddress } from "./email-domain";
import { ALICIA_EMPLOYEE_ID, ALICIA_INDUCTION_FORM_ID } from "./alicia-types";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function emailEq(a: string, b: string): boolean {
  return migrateEmailAddress(a).toLowerCase() === migrateEmailAddress(b).toLowerCase();
}

export function presenterTaskId(formId: string, sectionId: string): string {
  return `tsk-ind-sec-${formId}-${sectionId}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function buildPresenterTask(args: {
  form: InductionChecklistForm;
  employee: Employee;
  section: InductionSection;
}): ChecklistTask {
  const def = getInductionSectionDefinition(args.section.id);
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 5,
      escalationAfterWorkingDays: 3,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "hr@ppg-demo.com",
    },
    assignedAt,
    false
  );
  const due =
    args.form.formDueDate ||
    addWorkingDays(args.employee.startDate || new Date().toISOString().slice(0, 10), -2)
      .toISOString()
      .slice(0, 10);
  const email = args.section.assignedEmail || def?.assignedEmail || "";
  const team = def?.responsibleTeam || "HR Operations";
  const profile = profileByEmail(email);

  return {
    id: presenterTaskId(args.form.id, args.section.id),
    employeeId: args.employee.id,
    onboardingCaseId: args.form.lifecycleCaseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: args.form.lifecycleCaseId,
    group: "HR Checklist",
    title: `Complete ${args.section.sectionName} – ${args.employee.fullName}`,
    description: `Deliver the ${args.section.sectionName} session and confirm completion on the Induction Checklist.`,
    instructions:
      "Review the section items, mark the session completed, and confirm your name and initials. Completed On is set automatically.",
    status: "Pending",
    priority: "High",
    assignedOwner: profile?.name || def?.presenterName || email,
    responsibleTeam: team,
    assignedPersonName: profile?.name || def?.presenterName || "",
    assignedEmail: email,
    assignedUserName: profile?.name || def?.presenterName || "",
    employeeName: args.employee.fullName,
    employeeEmail: args.employee.email,
    department: args.employee.department,
    dueDate: due,
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
    sortOrder: args.section.sortOrder || 10,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Induction Checklist Section",
    sourceRecordId: `${args.form.id}::${args.section.id}`,
    linkedInductionFormId: args.form.id,
    relatedFormType: "Induction Checklist",
    relatedFormId: args.form.id,
    relatedSectionId: args.section.id,
    isInductionPresenterTask: true,
    responsibleRole: args.section.responsibleRole || def?.responsibleRole,
    ...reminder,
  };
}

function ensurePresenterEmails(
  uow: UnitOfWork,
  form: InductionChecklistForm,
  tasks: ChecklistTask[]
) {
  const byEmail = new Map<string, ChecklistTask[]>();
  for (const t of tasks) {
    const key = t.assignedEmail.toLowerCase();
    const list = byEmail.get(key) || [];
    list.push(t);
    byEmail.set(key, list);
  }

  const created: string[] = [];
  for (const [email, group] of byEmail) {
    const subjectBase =
      group.length === 1
        ? `${group[0].title.replace(/^Complete /, "").replace(/ – .*$/, "")} Assigned – ${form.employeeName}`
        : `Induction Sessions Assigned – ${form.employeeName}`;
    const subject =
      group.length > 1 && emailEq(email, "hr@ppg-demo.com")
        ? `Induction Sessions Assigned – ${form.employeeName}`
        : group.length === 1
          ? subjectBase.replace("Complete ", "")
          : subjectBase;

    const exists = uow.mockEmails.list().some(
      (e) =>
        emailEq(e.to, email) &&
        e.relatedFormId === form.id &&
        e.notificationType === "Induction Presenter Assignment" &&
        (group.length > 1
          ? /Induction Sessions Assigned/i.test(e.subject)
          : e.subject.includes(group[0].relatedSectionId || "") ||
            e.htmlBody.includes(group[0].id))
    );
    // Broader dedupe by subject + recipient + form
    const existsBroad = uow.mockEmails.list().some(
      (e) =>
        emailEq(e.to, email) &&
        e.onboardingCaseId === form.lifecycleCaseId &&
        e.notificationType === "Induction Presenter Assignment" &&
        e.relatedFormId === form.id
    );
    if (exists || existsBroad) continue;

    const lines = group
      .map((t) => `<li>${t.title.replace(` – ${form.employeeName}`, "")}</li>`)
      .join("");
    uow.mockEmails.createMany([
      {
        id: uid("mail-ind-presenter"),
        automationRunId: "",
        from: "hr@ppg-demo.com",
        to: email,
        cc: [],
        subject:
          emailEq(email, "hr@ppg-demo.com") && group.length >= 2
            ? `Induction Sessions Assigned – ${form.employeeName}`
            : group.length === 1
              ? `${group[0].relatedSectionId === "induction-section-it" ? "IT Induction Assigned" : group[0].title.replace(/^Complete /, "").replace(/ – .*$/, "") + " Assigned"} – ${form.employeeName}`
              : subject,
        htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
          <p>You have been assigned induction session(s) for <strong>${form.employeeName}</strong>.</p>
          <ul>${lines}</ul>
          <p>Employee ID: ${form.employeeId}<br/>Department: ${form.department}<br/>Start-related due: ${form.formDueDate || "—"}</p>
          <p><a href="/oneflow/my-tasks" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Open My Tasks</a></p>
        </div>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: form.employeeId,
        onboardingCaseId: form.lifecycleCaseId,
        responsibleTeam: group[0].responsibleTeam,
        relatedFormType: "Induction Checklist",
        relatedFormId: form.id,
        notificationType: "Induction Presenter Assignment",
        sourceType: "Induction Checklist Section",
        sourceRecordId: form.id,
      },
    ]);
    created.push(email);
  }
  return created;
}

/**
 * Deduplicate sections on a form and create missing presenter tasks.
 * Idempotent — uses formId + sectionId as the unique task key.
 */
export function ensureInductionPresenterWorkflow(
  uow: UnitOfWork,
  formId: string,
  options?: { sendEmails?: boolean; actor?: string }
): {
  form: InductionChecklistForm;
  removedDuplicates: number;
  tasksCreated: number;
  tasksRepaired: number;
  emailsCreated: number;
  messages: string[];
} {
  const form = uow.inductionForms.getById(formId);
  if (!form) {
    throw new Error(`Induction form not found: ${formId}`);
  }
  const employee = uow.employees.getById(form.employeeId);
  if (!employee) {
    throw new Error("Employee not found for induction form.");
  }

  const messages: string[] = [];
  const { sections, removed } = dedupeInductionSections(form.inductionSections);
  let tasksCreated = 0;
  let tasksRepaired = 0;
  const newTasks: ChecklistTask[] = [];

  const nextSections = sections.map((s) => {
    const id = resolveInductionSectionId(s);
    const def = getInductionSectionDefinition(id);
    const required = isSectionRequired({ ...s, id });
    if (!required || s.status === "Not Required") {
      return {
        ...s,
        id,
        assignedEmail: s.assignedEmail || def?.assignedEmail,
        responsibleRole: s.responsibleRole || def?.responsibleRole,
        linkedTaskId: null,
      };
    }

    const taskId = presenterTaskId(form.id, id);
    let task =
      uow.tasks.getById(taskId) ||
      uow.tasks
        .list()
        .find(
          (t) =>
            t.isInductionPresenterTask &&
            t.relatedFormId === form.id &&
            t.relatedSectionId === id
        );

    if (!task) {
      task = buildPresenterTask({
        form,
        employee,
        section: { ...s, id, assignedEmail: s.assignedEmail || def?.assignedEmail },
      });
      // Don't create if section already completed
      if (isSectionCleared(s)) {
        task = {
          ...task,
          status: "Completed",
          outcome: "Completed",
          completedAt: s.confirmedAt || s.completedOn || nowIso(),
        };
      }
      uow.tasks.createMany([task]);
      newTasks.push(task);
      tasksCreated += 1;
    } else {
      const patched = {
        ...task,
        id: taskId,
        assignedEmail: s.assignedEmail || def?.assignedEmail || task.assignedEmail,
        linkedInductionFormId: form.id,
        relatedFormId: form.id,
        relatedFormType: "Induction Checklist",
        relatedSectionId: id,
        isInductionPresenterTask: true,
        sourceType: "Induction Checklist Section" as const,
        sourceRecordId: `${form.id}::${id}`,
        onboardingCaseId: form.lifecycleCaseId,
        lifecycleCaseId: form.lifecycleCaseId,
      };
      if (patched.id !== task.id) {
        uow.tasks.replaceAll([
          patched,
          ...uow.tasks.list().filter((t) => t.id !== task!.id),
        ]);
      } else {
        uow.tasks.update(patched);
      }
      task = patched;
      tasksRepaired += 1;
    }

    return {
      ...s,
      id,
      assignedEmail: s.assignedEmail || def?.assignedEmail,
      responsibleRole: s.responsibleRole || def?.responsibleRole,
      linkedTaskId: task.id,
      sortOrder: s.sortOrder ?? def?.sortOrder,
    };
  });

  // Remove orphan presenter tasks for this form that don't match current required sections
  const validTaskIds = new Set(
    nextSections.map((s) => s.linkedTaskId).filter(Boolean) as string[]
  );
  const orphans = uow.tasks.list().filter(
    (t) =>
      t.isInductionPresenterTask &&
      t.relatedFormId === form.id &&
      !validTaskIds.has(t.id)
  );
  if (orphans.length) {
    uow.tasks.replaceAll(
      uow.tasks.list().filter((t) => !orphans.some((o) => o.id === t.id))
    );
    messages.push(`${orphans.length} orphan presenter task(s) removed`);
  }

  let nextForm: InductionChecklistForm = {
    ...form,
    inductionSections: nextSections,
    formStatus: deriveInductionFormStatus({
      ...form,
      inductionSections: nextSections,
    }),
    updatedAt: nowIso(),
  };
  uow.inductionForms.update(nextForm);

  let emailsCreated = 0;
  if (options?.sendEmails !== false && newTasks.length) {
    const openNew = newTasks.filter((t) => t.status !== "Completed");
    if (openNew.length) {
      emailsCreated = ensurePresenterEmails(uow, nextForm, openNew).length;
    }
  }

  if (removed) messages.push(`${removed} duplicate sections removed`);
  messages.push(`${nextSections.length} unique sections retained`);
  if (tasksCreated) messages.push(`${tasksCreated} missing presenter tasks created`);
  if (tasksRepaired) messages.push(`${tasksRepaired} existing task links repaired`);
  if (emailsCreated) messages.push(`${emailsCreated} presenter notification email(s) created`);
  messages.push("Induction progress recalculated");

  // Start-date attention: within 2 working days and sessions incomplete
  const pendingRequired = incompleteRequiredInductionSections(nextForm);
  if (pendingRequired.length) {
    const start = employee.startDate || "";
    const attentionCutoff = addWorkingDays(new Date().toISOString().slice(0, 10), 2)
      .toISOString()
      .slice(0, 10);
    if (start && start <= attentionCutoff) {
      messages.push(
        `Needs Attention: ${pendingRequired.length} required session(s) incomplete and start date is within two working days`
      );
      const already = uow.mockEmails.list().some(
        (e) =>
          emailEq(e.to, "hr@ppg-demo.com") &&
          e.relatedFormId === form.id &&
          e.notificationType === "Induction Needs Attention"
      );
      if (!already) {
        uow.mockEmails.createMany([
          {
            id: uid("mail-ind-attn"),
            automationRunId: "",
            from: "oneflow@ppg-demo.com",
            to: "hr@ppg-demo.com",
            cc: [],
            subject: `Needs Attention: Induction incomplete – ${form.employeeName}`,
            htmlBody: `<p>Required induction sessions remain incomplete for <strong>${form.employeeName}</strong> (start ${start}).</p><p><a href="/oneflow/my-tasks">Open My Tasks</a></p>`,
            sentAt: nowIso(),
            readAt: null,
            status: "Unread",
            employeeId: form.employeeId,
            onboardingCaseId: form.lifecycleCaseId,
            responsibleTeam: "HR Operations",
            relatedFormId: form.id,
            notificationType: "Induction Needs Attention",
          },
        ]);
      }
    }
  }

  uow.persist();
  return {
    form: nextForm,
    removedDuplicates: removed,
    tasksCreated,
    tasksRepaired,
    emailsCreated,
    messages,
  };
}

export function startInductionSession(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string
) {
  const task = uow.tasks.getById(taskId);
  if (!task?.isInductionPresenterTask) {
    return { ok: false as const, error: "Not an induction presenter task." };
  }
  if (!emailEq(task.assignedEmail, session.email) && session.role !== "Admin") {
    return { ok: false as const, error: "Not authorized." };
  }
  if (task.status === "Completed") {
    return { ok: false as const, error: "Task already completed." };
  }

  const form = uow.inductionForms.getById(task.relatedFormId || task.linkedInductionFormId || "");
  if (!form) return { ok: false as const, error: "Linked induction form not found." };

  const sectionId = task.relatedSectionId || "";
  const sections = form.inductionSections.map((s) => {
    if (resolveInductionSectionId(s) !== sectionId) return s;
    return {
      ...s,
      status: "In Progress" as const,
      id: sectionId,
    };
  });
  uow.inductionForms.update({
    ...form,
    inductionSections: sections,
    formStatus: "Sessions In Progress",
    updatedAt: nowIso(),
  });
  uow.tasks.update({
    ...task,
    status: "In Progress",
    startedAt: task.startedAt || nowIso(),
  });
  uow.activity.create({
    id: uid("act-ind-start"),
    employeeId: form.employeeId,
    onboardingCaseId: form.lifecycleCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Induction session started",
    detail: task.title,
  });
  uow.persist();
  return { ok: true as const, form: uow.inductionForms.getById(form.id)! };
}

export function completeInductionSession(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string,
  args?: {
    completedOn?: string;
    remarks?: string;
    pastDateReason?: string;
    itemCoverage?: Record<string, "Covered" | "Not Applicable" | "Follow-up Required">;
  }
) {
  const task = uow.tasks.getById(taskId);
  if (!task?.isInductionPresenterTask) {
    return { ok: false as const, error: "Not an induction presenter task." };
  }
  if (!emailEq(task.assignedEmail, session.email) && session.role !== "Admin") {
    return { ok: false as const, error: "Not authorized." };
  }

  const formId = task.relatedFormId || task.linkedInductionFormId || "";
  const form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Linked induction form not found." };

  const sectionId = task.relatedSectionId || "";
  const section = form.inductionSections.find(
    (s) => resolveInductionSectionId(s) === sectionId
  );
  if (!section) return { ok: false as const, error: "Section not found on form." };

  const items = (section.items || []).map((it) => {
    const coverage = args?.itemCoverage?.[it.id] || it.coverage || "Covered";
    return { ...it, coverage };
  });
  const blocking = items.filter(
    (it) =>
      it.coverage === "Pending" || it.coverage === "Follow-up Required"
  );
  // Auto-cover items if presenter didn't set coverage individually
  const finalizedItems =
    blocking.length && !args?.itemCoverage
      ? items.map((it) => ({
          ...it,
          coverage: (it.coverage === "Pending" ? "Covered" : it.coverage) as typeof it.coverage,
        }))
      : items;
  const stillBlocking = finalizedItems.filter(
    (it) => it.coverage === "Pending" || it.coverage === "Follow-up Required"
  );
  if (stillBlocking.length) {
    return {
      ok: false as const,
      error: `Mark all items Covered or Not Applicable first (${stillBlocking.length} remaining).`,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const completedOn = args?.completedOn || today;
  if (completedOn < today && !args?.pastDateReason?.trim() && session.role !== "Admin") {
    return {
      ok: false as const,
      error: "Provide a reason when selecting a past completion date.",
    };
  }

  const profile = profileByEmail(session.email);
  const initials =
    profile?.initials ||
    session.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 3) ||
    initialsFromName(session.name);

  const confirmedAt = nowIso();
  const nextSections = form.inductionSections.map((s) => {
    if (resolveInductionSectionId(s) !== sectionId) return s;
    return {
      ...s,
      id: sectionId,
      status: "Completed" as const,
      completedOn,
      confirmedAt,
      presenterName: session.name,
      presenterEmail: session.email,
      presenterUserId: session.userId,
      presenterInitials: initials,
      presenterSignatureStatus: "Signed" as const,
      presenterRemarks: args?.remarks || s.presenterRemarks || "",
      remarks: args?.remarks || s.remarks,
      items: finalizedItems,
      linkedTaskId: task.id,
    };
  });

  const nextForm: InductionChecklistForm = {
    ...form,
    inductionSections: nextSections,
    formStatus: deriveInductionFormStatus({
      ...form,
      inductionSections: nextSections,
    }),
    updatedAt: nowIso(),
  };
  uow.inductionForms.update(nextForm);
  uow.tasks.update({
    ...stopAllReminders(task),
    status: "Completed",
    outcome: "Completed",
    completedAt: confirmedAt,
    completedBy: session.email,
    completedByName: session.name,
    remarks: args?.remarks || task.remarks,
  });
  uow.activity.create({
    id: uid("act-ind-complete"),
    employeeId: form.employeeId,
    onboardingCaseId: form.lifecycleCaseId,
    timestamp: confirmedAt,
    actor: session.name,
    action: "Induction session completed",
    detail: `${section.sectionName} · Completed On ${completedOn}`,
  });
  uow.persist();
  return { ok: true as const, form: nextForm };
}

export function returnInductionSessionForReschedule(
  uow: UnitOfWork,
  session: UserSession,
  taskId: string,
  reason: string
) {
  if (!reason.trim()) {
    return { ok: false as const, error: "Reschedule reason is required." };
  }
  const task = uow.tasks.getById(taskId);
  if (!task?.isInductionPresenterTask) {
    return { ok: false as const, error: "Not an induction presenter task." };
  }
  if (!emailEq(task.assignedEmail, session.email) && session.role !== "Admin") {
    return { ok: false as const, error: "Not authorized." };
  }
  const form = uow.inductionForms.getById(
    task.relatedFormId || task.linkedInductionFormId || ""
  );
  if (!form) return { ok: false as const, error: "Form not found." };
  const sectionId = task.relatedSectionId || "";
  uow.inductionForms.update({
    ...form,
    inductionSections: form.inductionSections.map((s) =>
      resolveInductionSectionId(s) === sectionId
        ? {
            ...s,
            status: "Returned for Correction" as const,
            presenterRemarks: reason,
            remarks: reason,
          }
        : s
    ),
    updatedAt: nowIso(),
  });
  uow.tasks.update({
    ...task,
    status: "Pending",
    outcome: "Returned for Correction",
    remarks: reason,
  });
  uow.persist();
  return { ok: true as const };
}

export function repairAliciaInductionWorkflow(
  uow: UnitOfWork,
  session: UserSession
): { ok: true; message: string; messages: string[] } | { ok: false; error: string } {
  if (session.role !== "Admin") {
    return { ok: false, error: "Admin only." };
  }
  const form =
    uow.inductionForms.getById(ALICIA_INDUCTION_FORM_ID) ||
    uow.inductionForms.list().find((f) => f.employeeId === ALICIA_EMPLOYEE_ID);
  if (!form) {
    return { ok: false, error: "Alicia induction form not found." };
  }
  // Normalize form id
  let working = form;
  if (form.id !== ALICIA_INDUCTION_FORM_ID) {
    working = { ...form, id: ALICIA_INDUCTION_FORM_ID };
    uow.inductionForms.replaceAll([
      working,
      ...uow.inductionForms.list().filter((f) => f.id !== form.id && f.employeeId !== ALICIA_EMPLOYEE_ID),
    ]);
  }
  const result = ensureInductionPresenterWorkflow(uow, working.id, {
    sendEmails: true,
    actor: session.name,
  });
  uow.activity.create({
    id: uid("act-ind-repair"),
    employeeId: ALICIA_EMPLOYEE_ID,
    onboardingCaseId: working.lifecycleCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Repair Alicia Induction Workflow",
    detail: result.messages.join(" · "),
  });
  uow.persist();
  return {
    ok: true,
    message: result.messages.map((m) => `• ${m}`).join("\n"),
    messages: result.messages,
  };
}

export function resetAliciaInductionJourney(
  uow: UnitOfWork,
  session: UserSession
): { ok: true; message: string } | { ok: false; error: string } {
  if (session.role !== "Admin") return { ok: false, error: "Admin only." };
  const form =
    uow.inductionForms.getById(ALICIA_INDUCTION_FORM_ID) ||
    uow.inductionForms.list().find((f) => f.employeeId === ALICIA_EMPLOYEE_ID);
  if (!form) return { ok: false, error: "Alicia induction form not found." };

  const employee = uow.employees.getById(form.employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  // Remove presenter tasks for this form
  uow.tasks.replaceAll(
    uow.tasks.list().filter(
      (t) =>
        !(
          t.isInductionPresenterTask &&
          (t.relatedFormId === form.id ||
            t.linkedInductionFormId === form.id ||
            t.employeeId === ALICIA_EMPLOYEE_ID)
        )
    )
  );

  // Remove presenter assignment emails
  uow.mockEmails.replaceAll(
    uow.mockEmails.list().filter(
      (e) =>
        !(
          e.relatedFormId === form.id &&
          e.notificationType === "Induction Presenter Assignment"
        )
    )
  );

  const blankSections = buildDefaultInductionSections();

  const resetForm: InductionChecklistForm = {
    ...form,
    id: ALICIA_INDUCTION_FORM_ID,
    formStatus: "Sent",
    inductionSections: blankSections,
    employeeDeclaration: false,
    typedSignature: "",
    acknowledgementDate: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    hrRemarks: "",
    linkedReviewTaskId: null,
    updatedAt: nowIso(),
  };
  uow.inductionForms.replaceAll([
    resetForm,
    ...uow.inductionForms
      .list()
      .filter((f) => f.employeeId !== ALICIA_EMPLOYEE_ID && f.id !== form.id),
  ]);

  const result = ensureInductionPresenterWorkflow(uow, ALICIA_INDUCTION_FORM_ID, {
    sendEmails: true,
    actor: session.name,
  });

  uow.activity.create({
    id: uid("act-ind-reset"),
    employeeId: ALICIA_EMPLOYEE_ID,
    onboardingCaseId: resetForm.lifecycleCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Reset Alicia Induction Journey",
    detail: result.messages.join(" · "),
  });
  uow.persist();
  return {
    ok: true,
    message: `Induction reset. ${result.messages.join(" · ")}`,
  };
}

export function populateAllInductionSessionsDemo(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  if (session.role !== "Admin" && session.role !== "HR") {
    return { ok: false as const, error: "Not authorized." };
  }
  ensureInductionPresenterWorkflow(uow, formId, { sendEmails: false });
  const form = uow.inductionForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };

  const today = new Date().toISOString().slice(0, 10);
  for (const section of form.inductionSections) {
    if (!isSectionRequired(section) || isSectionCleared(section)) continue;
    const taskId = section.linkedTaskId || presenterTaskId(form.id, section.id);
    const def = getInductionSectionDefinition(section.id);
    const fakeSession: UserSession = {
      userId: profileByEmail(def?.assignedEmail || "")?.userId || session.userId,
      email: def?.assignedEmail || session.email,
      name: def?.presenterName || session.name,
      role: session.role,
      loggedInAt: nowIso(),
    };
    // Ensure task exists and assigned
    let task = uow.tasks.getById(taskId);
    if (!task) {
      ensureInductionPresenterWorkflow(uow, formId, { sendEmails: false });
      task = uow.tasks.getById(presenterTaskId(form.id, section.id));
    }
    if (task) {
      completeInductionSession(uow, fakeSession, task.id, {
        completedOn: today,
        remarks: "Demo session completed",
      });
    }
  }
  const refreshed = uow.inductionForms.getById(formId)!;
  return { ok: true as const, form: refreshed };
}

export { inductionSectionProgress, INDUCTION_REVIEW_TASK_TITLE };
