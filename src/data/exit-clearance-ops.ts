import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import type { Employee } from "./types";
import { migrateEmailAddress } from "./email-domain";
import {
  applySampleAnswers,
  buildConfirmationTasks,
  buildDepartmentConfirmationEmails,
  buildExitEmployeeTask,
  buildInitialExitFormEmail,
  calculateExitFormProgress,
  exitActivity,
  EXIT_EMPLOYEE_TASK_TITLE,
  itemNeedsConfirmation,
  recordExitAutomationRun,
  snapshotExitFormFromTemplates,
  validateExitFormForSubmit,
} from "./exit-clearance-engine";
import type {
  EmployeeExitClearanceForm,
  ExitClearanceChecklistItem,
  ExitEmployeeAnswer,
} from "./exit-clearance-types";
import {
  DANIEL_EMPLOYEE_ID,
  DANIEL_EXIT_FORM_ID,
  DANIEL_OFFBOARDING_CASE_ID,
} from "./exit-clearance-types";
import { buildDanielDemoPackage } from "./daniel-seed";
import { refreshOffboardingCaseProgress } from "./offboarding-engine";
import { stopAllReminders } from "./automation/reminder-engine";
import { TaskWorkflowService } from "./task-workflow-service";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export type ExitFormEmployeePatch = {
  personalEmail?: string;
  contactNumber?: string;
  checklistItems?: Array<{
    id: string;
    employeeAnswer?: ExitEmployeeAnswer;
    conditionalValues?: Record<string, string>;
  }>;
  employeeDeclarationConfirmed?: boolean;
  employeeTypedSignature?: string;
};

export function canAccessExitForm(
  session: UserSession,
  form: EmployeeExitClearanceForm
): boolean {
  if (session.role === "Admin" || session.role === "HR") return true;
  if (session.role === "OFFBOARDING_EMPLOYEE") {
    return form.employeeEmail.toLowerCase() === session.email.toLowerCase();
  }
  return false;
}

export function canConfirmExitItem(
  session: UserSession,
  item: ExitClearanceChecklistItem
): boolean {
  if (session.role === "Admin") return true;
  const email = migrateEmailAddress(session.email).toLowerCase();
  const assigned = migrateEmailAddress(
    item.confirmationAssignedEmail
  ).toLowerCase();
  return email === assigned;
}

function applyEmployeePatch(
  form: EmployeeExitClearanceForm,
  patch: ExitFormEmployeePatch,
  { correctionOnly }: { correctionOnly?: boolean } = {}
): EmployeeExitClearanceForm {
  const items = form.checklistItems.map((item) => {
    const p = patch.checklistItems?.find((x) => x.id === item.id);
    if (!p) return item;
    if (correctionOnly && !item.unlockedForCorrection) return item;
    const locked =
      form.formStatus === "Submitted" ||
      form.formStatus === "Confirmation In Progress" ||
      form.formStatus === "Fully Cleared" ||
      form.formStatus === "Completed";
    if (locked && !item.unlockedForCorrection) return item;
    return {
      ...item,
      employeeAnswer: p.employeeAnswer ?? item.employeeAnswer,
      conditionalValues: p.conditionalValues
        ? { ...item.conditionalValues, ...p.conditionalValues }
        : item.conditionalValues,
    };
  });
  return {
    ...form,
    personalEmail: patch.personalEmail ?? form.personalEmail,
    contactNumber: patch.contactNumber ?? form.contactNumber,
    employeeDeclarationConfirmed:
      patch.employeeDeclarationConfirmed ?? form.employeeDeclarationConfirmed,
    employeeTypedSignature:
      patch.employeeTypedSignature ?? form.employeeTypedSignature,
    checklistItems: items,
    updatedAt: nowIso(),
  };
}

/** Attach exit form + employee task + initial email to a new offboarding case. */
export function attachExitClearanceToCase(
  uow: UnitOfWork,
  employee: Employee,
  caseId: string
): EmployeeExitClearanceForm | null {
  if (uow.exitClearanceForms.getByCaseId(caseId)) return null;
  const templates = uow.exitClearanceTemplates.listActive();
  const form = snapshotExitFormFromTemplates(employee, caseId, templates);
  const employeeTask = buildExitEmployeeTask({
    employee,
    caseId,
    formId: form.id,
    dueDate: form.formDueDate,
  });
  const runId = recordExitAutomationRun({
    uow,
    employee,
    caseId,
    trigger: "Exit clearance form sent",
    taskCount: 1,
    emailCount: 1,
  });
  const email = buildInitialExitFormEmail({ form, runId });
  form.formStatus = "Sent";
  form.initialEmailId = email.id;
  uow.exitClearanceForms.create(form);
  uow.tasks.createMany([employeeTask]);
  uow.mockEmails.createMany([email]);
  uow.activity.create(
    exitActivity(
      employee.id,
      caseId,
      "OneFlow Automation",
      "Exit clearance form sent",
      `Employee Exit Clearance Form emailed to ${employee.email}`
    )
  );
  return form;
}

export function openExitForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
): { ok: true; form: EmployeeExitClearanceForm } | { ok: false; error: string } {
  const form = uow.exitClearanceForms.getById(formId);
  if (!form) return { ok: false, error: "Form not found." };
  if (!canAccessExitForm(session, form)) {
    return { ok: false, error: "Not authorized to open this form." };
  }
  let next = form;
  if (form.formStatus === "Sent" || !form.openedAt) {
    next = {
      ...form,
      formStatus: form.formStatus === "Sent" ? "Opened" : form.formStatus,
      openedAt: form.openedAt || nowIso(),
      updatedAt: nowIso(),
    };
    uow.exitClearanceForms.update(next);
    uow.activity.create(
      exitActivity(
        form.employeeId,
        form.offboardingCaseId,
        session.name,
        "Exit form opened",
        "Employee opened the Exit Clearance Form"
      )
    );
    if (form.initialEmailId) {
      const email = uow.mockEmails.getById(form.initialEmailId);
      if (email?.attachments?.length) {
        uow.mockEmails.update({
          ...email,
          attachments: email.attachments.map((a) =>
            a.formId === form.id ? { ...a, openedAt: nowIso() } : a
          ),
        });
      }
    }
    const task = uow.tasks
      .list()
      .find(
        (t) =>
          t.exitFormId === form.id &&
          t.isExitClearanceEmployeeTask &&
          t.status === "Pending"
      );
    if (task) {
      uow.tasks.update({ ...task, status: "In Progress" });
    }
  }
  uow.persist();
  return { ok: true, form: uow.exitClearanceForms.getById(formId)! };
}

export function saveExitDraft(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch: ExitFormEmployeePatch
): { ok: true; form: EmployeeExitClearanceForm } | { ok: false; error: string } {
  const form = uow.exitClearanceForms.getById(formId);
  if (!form) return { ok: false, error: "Form not found." };
  if (!canAccessExitForm(session, form)) {
    return { ok: false, error: "Not authorized." };
  }
  if (
    form.formStatus === "Fully Cleared" ||
    form.formStatus === "Completed"
  ) {
    return { ok: false, error: "Form is locked." };
  }
  const correctionOnly = form.formStatus === "Returned for Correction";
  const next = {
    ...applyEmployeePatch(form, patch, { correctionOnly }),
    formStatus: correctionOnly
      ? ("Returned for Correction" as const)
      : ("Draft" as const),
  };
  uow.exitClearanceForms.update(next);
  uow.activity.create(
    exitActivity(
      form.employeeId,
      form.offboardingCaseId,
      session.name,
      "Exit form draft saved",
      "Employee saved Exit Clearance Form draft"
    )
  );
  uow.persist();
  return { ok: true, form: next };
}

export function submitExitForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string,
  patch: ExitFormEmployeePatch
): { ok: true; form: EmployeeExitClearanceForm } | { ok: false; error: string } {
  const form = uow.exitClearanceForms.getById(formId);
  if (!form) return { ok: false, error: "Form not found." };
  if (!canAccessExitForm(session, form)) {
    return { ok: false, error: "Not authorized." };
  }
  const isResubmit = form.formStatus === "Returned for Correction";
  let next = applyEmployeePatch(form, patch, {
    correctionOnly: isResubmit,
  });
  const err = validateExitFormForSubmit(next);
  if (err) return { ok: false, error: err };

  const employee = uow.employees.getById(form.employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  next = {
    ...next,
    formStatus: "Submitted",
    submittedAt: nowIso(),
    checklistItems: next.checklistItems.map((i) => {
      const wasCorrection = i.unlockedForCorrection;
      return {
        ...i,
        unlockedForCorrection: false,
        confirmationStatus: wasCorrection
          ? ("Pending" as const)
          : i.confirmationStatus,
      };
    }),
    updatedAt: nowIso(),
  };

  // Complete employee task
  const empTask = uow.tasks
    .list()
    .find((t) => t.exitFormId === form.id && t.isExitClearanceEmployeeTask);
  if (empTask && empTask.status !== "Completed") {
    uow.tasks.update({
      ...stopAllReminders(empTask),
      status: "Completed",
      completedAt: nowIso(),
      outcome: "Completed",
      completedBy: session.email,
      completedByName: session.name,
      taskType: empTask.taskType ?? "Action",
    });
  }

  // Create confirmation tasks (skip existing linked)
  const { tasks, updatedItems } = buildConfirmationTasks({
    form: next,
    employee,
  });
  next = { ...next, checklistItems: updatedItems, formStatus: "Confirmation In Progress" };

  // Avoid duplicate confirmation tasks by checklist item id only
  const existing = uow.tasks
    .list()
    .filter(
      (t) =>
        t.offboardingCaseId === form.offboardingCaseId &&
        (t.isExitClearanceConfirmation || t.taskType === "Confirmation")
    );
  const newTasks = tasks.filter(
    (t) =>
      !existing.some(
        (e) =>
          (e.linkedChecklistItemId || e.exitFormItemId) ===
          (t.linkedChecklistItemId || t.exitFormItemId)
      )
  );
  if (newTasks.length) uow.tasks.createMany(newTasks);

  // Resubmit: reopen completed confirmation tasks for corrected Pending items
  if (isResubmit) {
    for (const item of next.checklistItems) {
      if (item.confirmationStatus !== "Pending" || !item.linkedTaskId) continue;
      const linked = uow.tasks.getById(item.linkedTaskId);
      if (linked && linked.status === "Completed") {
        uow.tasks.update({
          ...linked,
          status: "Pending",
          outcome: "None",
          completedAt: null,
          completedBy: null,
          completedByName: null,
          reminderStatus: "Scheduled",
          reminderEnabled: true,
          nextReminderDueAt: nowIso(),
          reminderCount: 0,
          notes: `Resubmitted after correction · previous outcome retained in history`,
        });
      }
    }
  }

  // For resubmit: only notify departments for corrected items
  const notifyTasks = isResubmit
    ? newTasks.length
      ? newTasks
      : existing.filter((t) =>
          next.checklistItems.some(
            (i) =>
              i.linkedTaskId === t.id &&
              i.confirmationStatus === "Pending"
          )
        )
    : newTasks;

  const runId = recordExitAutomationRun({
    uow,
    employee,
    caseId: form.offboardingCaseId,
    trigger: isResubmit
      ? "Exit clearance form resubmitted"
      : "Exit clearance form submitted",
    taskCount: notifyTasks.length,
    emailCount: 0,
  });

  // Deduplicate emails by subject+to for this case
  const existingEmails = uow.mockEmails.list();
  const deptEmails = buildDepartmentConfirmationEmails({
    form: next,
    tasks: notifyTasks,
    runId,
  }).filter(
    (mail) =>
      !existingEmails.some(
        (e) =>
          e.onboardingCaseId === form.offboardingCaseId &&
          e.to === mail.to &&
          e.subject === mail.subject &&
          e.status !== "Deleted"
      )
  );
  if (deptEmails.length) uow.mockEmails.createMany(deptEmails);
  const run = uow.automationRuns.getById(runId);
  if (run) {
    uow.automationRuns.update({
      ...run,
      emailsGenerated: deptEmails.length,
    });
  }

  uow.exitClearanceForms.update(next);
  uow.activity.create(
    exitActivity(
      form.employeeId,
      form.offboardingCaseId,
      session.name,
      isResubmit ? "Exit form resubmitted" : "Exit form submitted",
      `${EXIT_EMPLOYEE_TASK_TITLE} submitted · ${notifyTasks.length} confirmation task(s)`
    )
  );
  refreshOffboardingCaseProgress(uow, form.offboardingCaseId);
  uow.persist();
  return { ok: true, form: next };
}

export function confirmExitItem(
  uow: UnitOfWork,
  session: UserSession,
  args: {
    formId: string;
    itemId: string;
    action:
      | "Start Review"
      | "Confirm"
      | "Reject"
      | "Return for Correction";
    name?: string;
    initial?: string;
    remarks?: string;
  }
): { ok: true; form: EmployeeExitClearanceForm } | { ok: false; error: string } {
  const form = uow.exitClearanceForms.getById(args.formId);
  if (!form) return { ok: false, error: "Form not found." };
  const item = form.checklistItems.find((i) => i.id === args.itemId);
  if (!item) return { ok: false, error: "Item not found." };

  // Start Review keeps lightweight local progress (maps to In Progress on task)
  if (args.action === "Start Review") {
    if (!canConfirmExitItem(session, item) && session.role !== "Admin") {
      return { ok: false, error: "Not authorized for this confirmation." };
    }
    const remarks = args.remarks ?? item.confirmationRemarks;
    const items = form.checklistItems.map((i) =>
      i.id === item.id
        ? {
            ...i,
            confirmationStatus: "In Progress" as const,
            confirmationRemarks: remarks,
          }
        : i
    );
    if (item.linkedTaskId) {
      const task = uow.tasks.getById(item.linkedTaskId);
      if (task) {
        uow.tasks.update({
          ...task,
          status: "In Progress",
          startedAt: task.startedAt || nowIso(),
          notes: remarks,
        });
      }
    }
    const next = {
      ...form,
      checklistItems: items,
      formStatus: "Confirmation In Progress" as const,
      updatedAt: nowIso(),
    };
    uow.exitClearanceForms.update(next);
    uow.activity.create(
      exitActivity(
        form.employeeId,
        form.offboardingCaseId,
        session.name,
        "Exit confirmation: Start Review",
        `${item.title} · Start Review`
      )
    );
    uow.persist();
    return { ok: true, form: next };
  }

  if (args.action === "Reject") {
    return { ok: false, error: "Use Return for Correction instead of Reject." };
  }

  // Confirm / Return for Correction — TaskWorkflowService only
  const workflow = new TaskWorkflowService(uow);
  let taskId = item.linkedTaskId;
  if (!taskId) {
    const found = uow.tasks
      .list()
      .find(
        (t) =>
          (t.linkedChecklistItemId === item.id || t.exitFormItemId === item.id) &&
          (t.taskType === "Confirmation" || t.isExitClearanceConfirmation)
      );
    taskId = found?.id ?? null;
  }
  if (!taskId) {
    return {
      ok: false,
      error: "No linked confirmation task. Run data repair or resubmit the form.",
    };
  }

  const result = workflow.executeConfirmationTask({
    taskId,
    actingUserId: session.userId,
    session,
    action: args.action === "Confirm" ? "Confirm" : "Return for Correction",
    remarks: args.remarks,
    initials: args.initial?.trim() || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };
  const updated = uow.exitClearanceForms.getById(form.id);
  if (!updated) return { ok: false, error: "Form missing after confirmation." };
  return { ok: true, form: updated };
}

export function populateSampleExitForm(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  const form = uow.exitClearanceForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  if (session.role !== "Admin" && !canAccessExitForm(session, form)) {
    return { ok: false as const, error: "Not authorized." };
  }
  const next = {
    ...applySampleAnswers(form),
    formStatus:
      form.formStatus === "Sent" || form.formStatus === "Not Sent"
        ? ("Draft" as const)
        : form.formStatus === "Opened"
          ? ("Draft" as const)
          : form.formStatus,
  };
  uow.exitClearanceForms.update(next);
  uow.activity.create(
    exitActivity(
      form.employeeId,
      form.offboardingCaseId,
      session.name,
      "Sample exit answers populated",
      "Demo: populated sample Exit Clearance answers"
    )
  );
  uow.persist();
  return { ok: true as const, form: next };
}

export function resetDanielExitJourney(uow: UnitOfWork, session: UserSession) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const daniel = buildDanielDemoPackage({
    checklistTemplates: uow.checklistTemplates.list(),
    assignmentRules: uow.assignmentRules.list(),
    exitClearanceTemplates: uow.exitClearanceTemplates.list(),
  });

  // Replace Daniel employee
  const others = uow.employees.list().filter((e) => e.id !== DANIEL_EMPLOYEE_ID);
  uow.employees.replaceAll([daniel.employee, ...others]);

  // Replace Daniel offboarding case
  const otherCases = uow.offboardingCases
    .list()
    .filter((c) => c.id !== DANIEL_OFFBOARDING_CASE_ID);
  uow.offboardingCases.replaceAll([daniel.offboardingCase, ...otherCases]);

  // Replace Daniel tasks
  const otherTasks = uow.tasks
    .list()
    .filter((t) => t.employeeId !== DANIEL_EMPLOYEE_ID);
  uow.tasks.replaceAll([...daniel.tasks, ...otherTasks]);

  // Replace Daniel forms
  const otherForms = uow.exitClearanceForms
    .list()
    .filter((f) => f.id !== DANIEL_EXIT_FORM_ID && f.employeeId !== DANIEL_EMPLOYEE_ID);
  uow.exitClearanceForms.replaceAll([daniel.exitForm, ...otherForms]);

  // Replace Daniel-related emails (by employeeId)
  const otherEmails = uow.mockEmails
    .list()
    .filter((e) => e.employeeId !== DANIEL_EMPLOYEE_ID);
  uow.mockEmails.replaceAll([...daniel.emails, ...otherEmails]);

  const otherActivity = uow.activity
    .list()
    .filter((a) => a.employeeId !== DANIEL_EMPLOYEE_ID);
  uow.activity.replaceAll([...daniel.activity, ...otherActivity]);

  uow.activity.create(
    exitActivity(
      DANIEL_EMPLOYEE_ID,
      DANIEL_OFFBOARDING_CASE_ID,
      session.name,
      "Daniel exit form journey reset",
      "Presentation demo: Daniel Exit Clearance journey restored to initial Sent state"
    )
  );
  uow.persist();
  return {
    ok: true as const,
    form: daniel.exitForm,
    offboardingCase: daniel.offboardingCase,
  };
}

export function confirmAllExitItems(
  uow: UnitOfWork,
  session: UserSession,
  formId: string
) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  let form = uow.exitClearanceForms.getById(formId);
  if (!form) return { ok: false as const, error: "Form not found." };
  for (const item of form.checklistItems) {
    if (!itemNeedsConfirmation(item)) continue;
    if (item.confirmationStatus === "Confirmed") continue;
    const result = confirmExitItem(uow, session, {
      formId,
      itemId: item.id,
      action: "Confirm",
      name: session.name,
      initial: "OA",
      remarks: "Demo: confirmed",
    });
    if (!result.ok) return result;
    form = result.form;
  }
  return { ok: true as const, form: uow.exitClearanceForms.getById(formId)! };
}

export { calculateExitFormProgress };
