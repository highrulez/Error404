/**
 * Idempotent Alicia Wong onboarding demo ensure / repair.
 * Stable IDs only — never creates duplicates on repeated calls.
 */

import type { UnitOfWork } from "./repositories/interfaces";
import type { UserSession } from "./auth-types";
import { createBlankInductionForm, dedupeInductionSections } from "./induction-seed";
import { ensureInductionPresenterWorkflow } from "./induction-presenter-workflow";
import { createBlankAccessCardForm } from "./access-card-seed";
import { buildAliciaWelcomeEmail, aliciaDemoStartDate } from "./alicia-seed";
import { addWorkingDays } from "./working-days";
import { INDUCTION_EMPLOYEE_TASK_TITLE } from "./induction-types";
import { ACCESS_CARD_EMPLOYEE_TASK_TITLE } from "./access-card-types";
import { initializeLaptopRequestForOnboardingCase } from "./laptop-request-workflow";
import {
  ALICIA_ACCESS_CARD_FORM_ID,
  ALICIA_EMAIL,
  ALICIA_EMPLOYEE_ID,
  ALICIA_EMPLOYEE_NUMBER,
  ALICIA_INDUCTION_FORM_ID,
  ALICIA_LEGACY_IDS,
  ALICIA_ONBOARDING_CASE_ID,
  isAliciaAccessCardFormId,
  isAliciaInductionFormId,
  isAliciaOnboardingCaseId,
  resolveAliciaAccessCardFormId,
  resolveAliciaInductionFormId,
  resolveAliciaOnboardingCaseId,
} from "./alicia-types";
import {
  ALICIA_LAPTOP_LEGACY_IDS,
  ALICIA_LAPTOP_MANAGER_TASK_ID,
  ALICIA_LAPTOP_REQUEST_ID,
  resolveAliciaLaptopManagerTaskId,
  resolveAliciaLaptopRequestId,
} from "./laptop-request-types";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export interface AliciaEnsureReport {
  ok: true;
  messages: string[];
  warnings: string[];
}

/**
 * Remap legacy Alicia IDs in-place so repository lookups by canonical ID succeed.
 */
export function migrateAliciaStableIds(uow: UnitOfWork): string[] {
  const notes: string[] = [];

  // Onboarding case
  const cases = uow.onboardingCases.list();
  const legacyCase = cases.find((c) => isAliciaOnboardingCaseId(c.id) && c.id !== ALICIA_ONBOARDING_CASE_ID);
  const canonicalCase = cases.find((c) => c.id === ALICIA_ONBOARDING_CASE_ID);
  if (legacyCase && !canonicalCase) {
    uow.onboardingCases.replaceAll([
      { ...legacyCase, id: ALICIA_ONBOARDING_CASE_ID },
      ...cases.filter((c) => c.id !== legacyCase.id),
    ]);
    notes.push("Onboarding case ID normalized");
  } else if (legacyCase && canonicalCase) {
    uow.onboardingCases.replaceAll(cases.filter((c) => c.id !== legacyCase.id));
    notes.push("Duplicate legacy onboarding case removed");
  }

  // Induction forms
  const inductions = uow.inductionForms.list();
  const aliciaInds = inductions.filter(
    (f) =>
      f.employeeId === ALICIA_EMPLOYEE_ID ||
      f.employeeEmail?.toLowerCase() === ALICIA_EMAIL ||
      isAliciaInductionFormId(f.id) ||
      isAliciaOnboardingCaseId(f.lifecycleCaseId)
  );
  if (aliciaInds.length) {
    const keep =
      aliciaInds.find((f) => f.id === ALICIA_INDUCTION_FORM_ID) ||
      aliciaInds.find((f) => isAliciaInductionFormId(f.id)) ||
      aliciaInds[0];
    const normalized = {
      ...keep,
      id: ALICIA_INDUCTION_FORM_ID,
      lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
      employeeId: ALICIA_EMPLOYEE_ID,
      employeeEmail: ALICIA_EMAIL,
    };
    uow.inductionForms.replaceAll([
      normalized,
      ...inductions.filter(
        (f) =>
          f.id !== keep.id &&
          !aliciaInds.some((a) => a.id === f.id)
      ),
    ]);
    if (keep.id !== ALICIA_INDUCTION_FORM_ID) notes.push("Induction form ID normalized");
    if (aliciaInds.length > 1) notes.push("Duplicate induction forms removed");
  }

  // Access card forms
  const accessForms = uow.accessCardForms.list();
  const aliciaAcc = accessForms.filter(
    (f) =>
      f.employeeId === ALICIA_EMPLOYEE_ID ||
      f.employeeEmail?.toLowerCase() === ALICIA_EMAIL ||
      isAliciaAccessCardFormId(f.id) ||
      isAliciaOnboardingCaseId(f.lifecycleCaseId)
  );
  if (aliciaAcc.length) {
    const keep =
      aliciaAcc.find((f) => f.id === ALICIA_ACCESS_CARD_FORM_ID) ||
      aliciaAcc.find((f) => isAliciaAccessCardFormId(f.id)) ||
      aliciaAcc[0];
    const normalized = {
      ...keep,
      id: ALICIA_ACCESS_CARD_FORM_ID,
      lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
      employeeId: ALICIA_EMPLOYEE_ID,
      employeeEmail: ALICIA_EMAIL,
    };
    uow.accessCardForms.replaceAll([
      normalized,
      ...accessForms.filter(
        (f) => f.id !== keep.id && !aliciaAcc.some((a) => a.id === f.id)
      ),
    ]);
    if (keep.id !== ALICIA_ACCESS_CARD_FORM_ID) notes.push("Access card form ID normalized");
    if (aliciaAcc.length > 1) notes.push("Duplicate access card forms removed");
  }

  // Tasks referencing legacy case / form IDs
  const tasks = uow.tasks.list().map((t) => {
    if (t.employeeId !== ALICIA_EMPLOYEE_ID && !isAliciaOnboardingCaseId(t.onboardingCaseId || "")) {
      return t;
    }
    let next = { ...t };
    if (isAliciaOnboardingCaseId(next.onboardingCaseId || "")) {
      next.onboardingCaseId = ALICIA_ONBOARDING_CASE_ID;
      next.lifecycleCaseId = ALICIA_ONBOARDING_CASE_ID;
    }
    if (next.linkedInductionFormId && isAliciaInductionFormId(next.linkedInductionFormId)) {
      next.linkedInductionFormId = ALICIA_INDUCTION_FORM_ID;
      next.relatedFormId = ALICIA_INDUCTION_FORM_ID;
      next.relatedFormType = "Induction Checklist";
      next.sourceRecordId = ALICIA_INDUCTION_FORM_ID;
    }
    if (next.linkedAccessCardFormId && isAliciaAccessCardFormId(next.linkedAccessCardFormId)) {
      next.linkedAccessCardFormId = ALICIA_ACCESS_CARD_FORM_ID;
      next.relatedFormId = ALICIA_ACCESS_CARD_FORM_ID;
      next.relatedFormType = "Access Card Application";
      next.sourceRecordId = ALICIA_ACCESS_CARD_FORM_ID;
    }
    if (
      next.isLaptopDecisionTask ||
      (ALICIA_LAPTOP_LEGACY_IDS.managerTask as readonly string[]).includes(next.id)
    ) {
      next = {
        ...next,
        id: resolveAliciaLaptopManagerTaskId(next.id),
        linkedLaptopRequestId: resolveAliciaLaptopRequestId(
          next.linkedLaptopRequestId || ALICIA_LAPTOP_REQUEST_ID
        ),
        sourceRecordId: ALICIA_LAPTOP_REQUEST_ID,
        onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
        lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
        isLaptopDecisionTask: true,
      };
    }
    return next;
  });
  // Deduplicate by id after remap
  const byId = new Map(tasks.map((t) => [t.id, t]));
  if (byId.size !== tasks.length) notes.push("Duplicate tasks collapsed after ID remap");
  uow.tasks.replaceAll([...byId.values()]);

  // Laptop requests
  const laptopReqs = uow.laptopRequests.list();
  const aliciaLaptops = laptopReqs.filter(
    (r) =>
      r.employeeId === ALICIA_EMPLOYEE_ID ||
      isAliciaOnboardingCaseId(r.onboardingCaseId) ||
      (ALICIA_LAPTOP_LEGACY_IDS.request as readonly string[]).includes(r.id)
  );
  if (aliciaLaptops.length) {
    const keep =
      aliciaLaptops.find((r) => r.id === ALICIA_LAPTOP_REQUEST_ID) || aliciaLaptops[0];
    const normalized = {
      ...keep,
      id: ALICIA_LAPTOP_REQUEST_ID,
      onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
      employeeId: ALICIA_EMPLOYEE_ID,
      managerTaskId: resolveAliciaLaptopManagerTaskId(
        keep.managerTaskId || ALICIA_LAPTOP_MANAGER_TASK_ID
      ),
    };
    uow.laptopRequests.replaceAll([
      normalized,
      ...laptopReqs.filter(
        (r) => r.id !== keep.id && !aliciaLaptops.some((a) => a.id === r.id)
      ),
    ]);
    if (keep.id !== ALICIA_LAPTOP_REQUEST_ID) notes.push("Laptop request ID normalized");
    if (aliciaLaptops.length > 1) notes.push("Duplicate laptop requests removed");
  }

  // Emails / attachments
  const emails = uow.mockEmails.list().map((e) => {
    if (
      e.employeeId !== ALICIA_EMPLOYEE_ID &&
      !isAliciaOnboardingCaseId(e.onboardingCaseId)
    ) {
      return e;
    }
    let next = {
      ...e,
      onboardingCaseId: isAliciaOnboardingCaseId(e.onboardingCaseId)
        ? ALICIA_ONBOARDING_CASE_ID
        : e.onboardingCaseId,
      employeeId: e.employeeId || ALICIA_EMPLOYEE_ID,
    };
    if (next.attachments?.length) {
      next = {
        ...next,
        attachments: next.attachments.map((a) => {
          if (a.kind === "induction-checklist") {
            return {
              ...a,
              formId: ALICIA_INDUCTION_FORM_ID,
              relatedFormType: "Induction Checklist",
              relatedFormId: ALICIA_INDUCTION_FORM_ID,
            };
          }
          if (a.kind === "access-card-application") {
            return {
              ...a,
              formId: ALICIA_ACCESS_CARD_FORM_ID,
              relatedFormType: "Access Card Application",
              relatedFormId: ALICIA_ACCESS_CARD_FORM_ID,
            };
          }
          return a;
        }),
      };
    }
    if (
      (ALICIA_LAPTOP_LEGACY_IDS.managerEmail as readonly string[]).includes(next.id) ||
      next.notificationType === "Laptop Manager Decision"
    ) {
      next = {
        ...next,
        relatedTaskId: ALICIA_LAPTOP_MANAGER_TASK_ID,
        sourceRecordId: ALICIA_LAPTOP_REQUEST_ID,
        sourceType: "Laptop Request",
        notificationType: "Laptop Manager Decision",
      };
    }
    return next;
  });
  uow.mockEmails.replaceAll(emails);

  return notes;
}

/**
 * Ensure Alicia onboarding demo data exists and is correctly linked.
 * Preserves answers / completed outcomes. Idempotent.
 */
export function ensureAliciaOnboardingDemoData(
  uow: UnitOfWork,
  session?: UserSession | null
): AliciaEnsureReport {
  const messages: string[] = [];
  const warnings: string[] = [];

  try {
    messages.push(...migrateAliciaStableIds(uow));

    const employee = uow.employees.getById(ALICIA_EMPLOYEE_ID);
    if (!employee) {
      warnings.push("Alicia employee missing — run Reset Demo Data or Reset Alicia Journey.");
      uow.persist();
      return { ok: true, messages, warnings };
    }

    let onb = uow.onboardingCases.getById(ALICIA_ONBOARDING_CASE_ID);
    if (!onb) {
      onb = uow.onboardingCases
        .list()
        .find((c) => c.employeeId === ALICIA_EMPLOYEE_ID);
      if (onb) {
        uow.onboardingCases.replaceAll([
          { ...onb, id: ALICIA_ONBOARDING_CASE_ID },
          ...uow.onboardingCases.list().filter((c) => c.id !== onb!.id),
        ]);
        onb = uow.onboardingCases.getById(ALICIA_ONBOARDING_CASE_ID)!;
        messages.push("Onboarding case repaired");
      } else {
        warnings.push("Alicia onboarding case missing.");
        uow.persist();
        return { ok: true, messages, warnings };
      }
    }

    const start = employee.startDate || aliciaDemoStartDate();
    const inductionDue = addWorkingDays(start, -2).toISOString().slice(0, 10);
    const accessDue = addWorkingDays(start, -5).toISOString().slice(0, 10);

    // Induction form
    let induction = uow.inductionForms.getById(ALICIA_INDUCTION_FORM_ID);
    if (!induction) {
      induction = createBlankInductionForm({
        id: ALICIA_INDUCTION_FORM_ID,
        lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
        lifecycleType: "Onboarding",
        employeeId: ALICIA_EMPLOYEE_ID,
        employeeName: employee.fullName,
        employeeEmail: ALICIA_EMAIL,
        jobTitle: employee.role,
        department: employee.department,
        dueDate: inductionDue,
      });
      induction = {
        ...induction,
        formStatus: "Sent",
        employeeName: "Alicia Wong",
        employeeEmail: ALICIA_EMAIL,
        jobTitle: "Customer Service Specialist",
        department: "Customer Service",
        updatedAt: nowIso(),
      };
      uow.inductionForms.create(induction);
      messages.push("Induction form created");
      try {
        const presenter = ensureInductionPresenterWorkflow(
          uow,
          ALICIA_INDUCTION_FORM_ID,
          { sendEmails: true, actor: session?.name || "OneFlow Ensure" }
        );
        messages.push(...presenter.messages);
      } catch (err) {
        warnings.push(
          err instanceof Error ? err.message : "Presenter workflow failed"
        );
      }
    } else {
      // Preserve answers; dedupe sections by stable ID (never append by random ID)
      const { sections, removed } = dedupeInductionSections(
        induction.inductionSections
      );
      uow.inductionForms.update({
        ...induction,
        id: ALICIA_INDUCTION_FORM_ID,
        lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
        employeeId: ALICIA_EMPLOYEE_ID,
        employeeEmail: ALICIA_EMAIL,
        employeeName: induction.employeeName || "Alicia Wong",
        jobTitle: induction.jobTitle || "Customer Service Specialist",
        department: induction.department || "Customer Service",
        acknowledgementDate: induction.acknowledgementDate ?? null,
        hrReceivedDate: induction.hrReceivedDate ?? null,
        hrRemarks: induction.hrRemarks ?? "",
        inductionSections: sections,
        updatedAt: nowIso(),
      });
      induction = uow.inductionForms.getById(ALICIA_INDUCTION_FORM_ID)!;
      if (removed > 0) {
        messages.push(`${removed} duplicate induction sections removed`);
      }
      messages.push("Induction form repaired");
    }

    // Ensure presenter tasks for Alicia induction
    try {
      const presenter = ensureInductionPresenterWorkflow(uow, ALICIA_INDUCTION_FORM_ID, {
        sendEmails: true,
        actor: session?.name || "OneFlow Ensure",
      });
      messages.push(...presenter.messages);
    } catch (err) {
      warnings.push(
        err instanceof Error
          ? err.message
          : "Induction presenter workflow ensure failed"
      );
    }

    // Access card form
    let access = uow.accessCardForms.getById(ALICIA_ACCESS_CARD_FORM_ID);
    if (!access) {
      access = createBlankAccessCardForm({
        id: ALICIA_ACCESS_CARD_FORM_ID,
        lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
        lifecycleType: "Onboarding",
        employeeId: ALICIA_EMPLOYEE_ID,
        employeeName: employee.fullName,
        employeeEmail: ALICIA_EMAIL,
        dueDate: accessDue,
      });
      access = {
        ...access,
        formStatus: "Sent",
        companyNameOnCard: "PPG",
        applicantName: "Alicia Wong",
        locationUnit: "L6-1",
        updatedAt: nowIso(),
      };
      uow.accessCardForms.create(access);
      messages.push("Access card form created");
    } else {
      uow.accessCardForms.update({
        ...access,
        id: ALICIA_ACCESS_CARD_FORM_ID,
        lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
        employeeId: ALICIA_EMPLOYEE_ID,
        employeeEmail: ALICIA_EMAIL,
        updatedAt: nowIso(),
      });
      access = uow.accessCardForms.getById(ALICIA_ACCESS_CARD_FORM_ID)!;
      messages.push("Access card form links repaired");
    }

    // Employee induction task link
    const tasks = uow.tasks.list().filter((t) => t.employeeId === ALICIA_EMPLOYEE_ID);
    let indTask =
      tasks.find((t) => t.isInductionEmployeeTask) ||
      tasks.find((t) => t.title === INDUCTION_EMPLOYEE_TASK_TITLE);
    if (indTask) {
      const needs =
        indTask.linkedInductionFormId !== ALICIA_INDUCTION_FORM_ID ||
        indTask.relatedFormId !== ALICIA_INDUCTION_FORM_ID ||
        indTask.onboardingCaseId !== ALICIA_ONBOARDING_CASE_ID ||
        indTask.assignedEmail?.toLowerCase() !== ALICIA_EMAIL;
      if (needs) {
        uow.tasks.update({
          ...indTask,
          linkedInductionFormId: ALICIA_INDUCTION_FORM_ID,
          relatedFormType: "Induction Checklist",
          relatedFormId: ALICIA_INDUCTION_FORM_ID,
          sourceRecordId: ALICIA_INDUCTION_FORM_ID,
          sourceType: "Induction Checklist",
          onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
          lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
          employeeId: ALICIA_EMPLOYEE_ID,
          assignedEmail: ALICIA_EMAIL,
          isInductionEmployeeTask: true,
        });
        messages.push("Induction task link repaired");
      }
      indTask = uow.tasks.getById(indTask.id)!;
      if (induction.linkedEmployeeTaskId !== indTask.id) {
        uow.inductionForms.update({
          ...induction,
          linkedEmployeeTaskId: indTask.id,
        });
      }
    } else {
      warnings.push("Induction employee task missing — reset journey to recreate.");
    }

    let accTask =
      tasks.find((t) => t.isAccessCardEmployeeTask) ||
      tasks.find((t) => t.title === ACCESS_CARD_EMPLOYEE_TASK_TITLE);
    if (accTask) {
      const needs =
        accTask.linkedAccessCardFormId !== ALICIA_ACCESS_CARD_FORM_ID ||
        accTask.onboardingCaseId !== ALICIA_ONBOARDING_CASE_ID;
      if (needs) {
        uow.tasks.update({
          ...accTask,
          linkedAccessCardFormId: ALICIA_ACCESS_CARD_FORM_ID,
          relatedFormType: "Access Card Application",
          relatedFormId: ALICIA_ACCESS_CARD_FORM_ID,
          sourceRecordId: ALICIA_ACCESS_CARD_FORM_ID,
          onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
          lifecycleCaseId: ALICIA_ONBOARDING_CASE_ID,
          employeeId: ALICIA_EMPLOYEE_ID,
          assignedEmail: ALICIA_EMAIL,
          isAccessCardEmployeeTask: true,
        });
        messages.push("Access card task link repaired");
      }
      accTask = uow.tasks.getById(accTask.id)!;
      if (access.linkedEmployeeTaskId !== accTask.id) {
        uow.accessCardForms.update({
          ...access,
          linkedEmployeeTaskId: accTask.id,
        });
      }
    }

    // Inbox attachments
    let emailTouched = false;
    const nextEmails = uow.mockEmails.list().map((e) => {
      if (e.employeeId !== ALICIA_EMPLOYEE_ID || !e.attachments?.length) return e;
      const attachments = e.attachments.map((a) => {
        if (a.kind === "induction-checklist" && a.formId !== ALICIA_INDUCTION_FORM_ID) {
          emailTouched = true;
          return {
            ...a,
            formId: ALICIA_INDUCTION_FORM_ID,
            relatedFormType: "Induction Checklist",
            relatedFormId: ALICIA_INDUCTION_FORM_ID,
          };
        }
        if (
          a.kind === "access-card-application" &&
          a.formId !== ALICIA_ACCESS_CARD_FORM_ID
        ) {
          emailTouched = true;
          return {
            ...a,
            formId: ALICIA_ACCESS_CARD_FORM_ID,
            relatedFormType: "Access Card Application",
            relatedFormId: ALICIA_ACCESS_CARD_FORM_ID,
          };
        }
        return a;
      });
      return { ...e, attachments, onboardingCaseId: ALICIA_ONBOARDING_CASE_ID };
    });
    if (emailTouched) {
      uow.mockEmails.replaceAll(nextEmails);
      messages.push("Inbox attachment repaired");
    }

    // Welcome email if missing
    const hasWelcome = uow.mockEmails
      .list()
      .some(
        (e) =>
          e.to.toLowerCase() === ALICIA_EMAIL &&
          e.subject.includes("Welcome to PPG")
      );
    if (!hasWelcome) {
      const welcome = buildAliciaWelcomeEmail(
        employee,
        ALICIA_INDUCTION_FORM_ID,
        ALICIA_ACCESS_CARD_FORM_ID
      );
      welcome.id = "mail-alicia-welcome-0921";
      uow.mockEmails.createMany([welcome]);
      messages.push("Welcome email created");
    }

    // Laptop request + manager task + email
    const laptop = initializeLaptopRequestForOnboardingCase(
      uow,
      ALICIA_ONBOARDING_CASE_ID,
      { actor: session?.name || "OneFlow Ensure" }
    );
    if (laptop.ok) {
      messages.push(...laptop.created, ...laptop.repaired);
      warnings.push(...laptop.warnings);
    } else {
      warnings.push(laptop.error);
    }

    if (session) {
      uow.activity.create({
        id: uid("act-ensure-alicia"),
        employeeId: ALICIA_EMPLOYEE_ID,
        onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
        timestamp: nowIso(),
        actor: session.name,
        action: "Ensure Alicia onboarding demo data",
        detail: [...messages, ...warnings].join(" · ") || "No changes",
      });
    }

    uow.persist();
    return { ok: true, messages: messages.filter(Boolean), warnings };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown ensure failure";
    warnings.push(detail);
    try {
      uow.automationRuns.create({
        id: uid("run-alicia-ensure-fail"),
        runNumber: `ENSURE-${Date.now().toString(36).toUpperCase()}`,
        trigger: "Ensure Alicia Onboarding",
        employeeId: ALICIA_EMPLOYEE_ID,
        onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
        status: "Failed",
        startedAt: nowIso(),
        endedAt: nowIso(),
        durationMs: 0,
        tasksAssigned: 0,
        emailsGenerated: 0,
        errorMessage: detail,
        steps: [
          {
            id: uid("step"),
            order: 1,
            name: "ensureAliciaOnboardingDemoData",
            status: "Failed",
            detail,
            startedAt: nowIso(),
            completedAt: nowIso(),
          },
        ],
        simulateFailure: false,
      });
      uow.persist();
    } catch {
      /* ignore secondary failure */
    }
    return { ok: true, messages, warnings };
  }
}

/** Admin repair entry — preserves answers; reports what changed. */
export function repairAliciaOnboardingJourney(
  uow: UnitOfWork,
  session: UserSession
): { ok: true; message: string; report: AliciaEnsureReport } | { ok: false; error: string } {
  if (session.role !== "Admin") {
    return { ok: false, error: "Admin only." };
  }
  const report = ensureAliciaOnboardingDemoData(uow, session);
  const lines = [
    ...report.messages.map((m) => `• ${m}`),
    ...report.warnings.map((w) => `⚠ ${w}`),
  ];
  return {
    ok: true,
    message:
      lines.length > 0
        ? lines.join("\n")
        : "Alicia onboarding already consistent — nothing to repair.",
    report,
  };
}

export {
  resolveAliciaInductionFormId,
  resolveAliciaAccessCardFormId,
  resolveAliciaOnboardingCaseId,
  ALICIA_INDUCTION_FORM_ID,
  ALICIA_ACCESS_CARD_FORM_ID,
  ALICIA_ONBOARDING_CASE_ID,
  ALICIA_EMPLOYEE_NUMBER,
  ALICIA_LEGACY_IDS,
};
