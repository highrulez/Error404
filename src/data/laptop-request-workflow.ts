import type { UnitOfWork } from "./repositories/interfaces";
import type { MockEmail, UserSession } from "./auth-types";
import type { ChecklistTask, Employee } from "./types";
import { initReminderFieldsFromTemplate, stopAllReminders } from "./automation/reminder-engine";
import { addWorkingDays } from "./working-days";
import { migrateEmailAddress } from "./email-domain";
import {
  ALICIA_LAPTOP_MANAGER_EMAIL_ID,
  ALICIA_LAPTOP_MANAGER_TASK_ID,
  ALICIA_LAPTOP_PO_TASK_ID,
  ALICIA_LAPTOP_PREPARE_TASK_ID,
  ALICIA_LAPTOP_REQUEST_ID,
  LAPTOP_DEMO,
  employeeSafeEquipmentStatus,
  type LaptopNotRequiredReason,
  type LaptopRequest,
  type LaptopRequirementType,
} from "./laptop-request-types";
import {
  ALICIA_EMAIL,
  ALICIA_EMPLOYEE_ID,
  ALICIA_ONBOARDING_CASE_ID,
} from "./alicia-types";
import { areItSecurityAccountTasksComplete } from "./automation/account-created-workflow";
import {
  ensureLaptopReplacementTask,
  ensureOnsiteEquipmentHandoff,
} from "./equipment-handoff-ops";
import { ONSITE_IT_SUPPORT_EMAIL } from "./automation/sailpoint-handoff";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function emailEq(a: string, b: string): boolean {
  return migrateEmailAddress(a).toLowerCase() === migrateEmailAddress(b).toLowerCase();
}

function blankRequest(
  employee: Employee,
  caseId: string,
  ids: { requestId: string; managerTaskId: string },
  now = nowIso()
): LaptopRequest {
  return {
    id: ids.requestId,
    onboardingCaseId: caseId,
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    managerName: employee.managerName,
    managerEmail: employee.managerEmail,
    requestStatus: "Awaiting Manager Decision",
    laptopRequired: null,
    managerDecision: null,
    managerDecisionReason: "",
    departmentCreditNumber: "",
    costCentre: "",
    laptopRequirementType: "",
    requestedSpecification: "",
    standardModelRequested: "",
    specialSpecificationRequired: false,
    businessJustification: "",
    requiredDeliveryDate: null,
    managerRemarks: "",
    managerSubmittedAt: null,
    managerSubmittedBy: null,
    procurementAssignedEmail: "admin@ppg-demo.com",
    vendorName: "",
    quotationReference: "",
    purchaseOrderNumber: "",
    purchaseOrderDate: null,
    estimatedDeliveryDate: null,
    procurementRemarks: "",
    procurementCompletedAt: null,
    procurementCompletedBy: null,
    onsiteITTaskId: null,
    managerTaskId: ids.managerTaskId,
    procurementTaskId: null,
    replacementTaskId: null,
    onsiteStatus: null,
    equipmentPath: "Decision Pending",
    itSecurityStage: "Pending",
    laptopDecisionStage: "Pending Manager Decision",
    procurementStage: "Not Required",
    onsiteItStage: "Awaiting Security Handoff",
    spareLaptopStatus: "",
    existingLaptopStatus: "",
    spareAssetNumber: "",
    existingAssetNumber: "",
    previousAssignment: "",
    deviceCondition: "",
    softwareRequirements: "",
    specialEquipmentNotes: "",
    networkIdSnapshot: "",
    companyEmailSnapshot: "",
    sailpointProvisioningStatus: "",
    securityHandoffAt: null,
    securityHandoffEmailId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function managerDecisionTask(
  employee: Employee,
  caseId: string,
  requestId: string,
  taskId: string
): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 3,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "hr@ppg-demo.com",
    },
    assignedAt,
    false
  );
  return {
    id: taskId,
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "Hiring Manager Checklist",
    title: `Laptop Requirement Decision – ${employee.fullName}`,
    description:
      "Confirm whether the new hire requires a company laptop and provide purchasing details if needed.",
    instructions:
      "Select Yes or No. If Yes, provide department credit number, cost centre and justification.",
    status: "Pending",
    priority: "High",
    assignedOwner: employee.managerName,
    responsibleTeam: "Hiring Manager",
    assignedPersonName: employee.managerName,
    assignedEmail: employee.managerEmail,
    assignedUserName: employee.managerName,
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
    sortOrder: 5,
    templateTaskId: "tmpl-laptop-decision",
    taskType: "Approval",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: requestId,
    linkedLaptopRequestId: requestId,
    isLaptopDecisionTask: true,
    ...reminder,
  };
}

function managerDecisionEmail(args: {
  employee: Employee;
  caseId: string;
  taskId: string;
  requestId: string;
  dueDate: string;
  emailId: string;
}): MockEmail {
  const { employee, caseId, taskId, requestId, dueDate, emailId } = args;
  return {
    id: emailId,
    automationRunId: "",
    from: "hr@ppg-demo.com",
    to: employee.managerEmail,
    cc: [],
    subject: `Action Required: Laptop Requirement for ${employee.fullName}`,
    htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
      <p>Hello ${employee.managerName},</p>
      <p>Please confirm whether ${employee.fullName} requires a new company laptop. If a new laptop is required, provide the department credit number and required purchasing information so Administration can create a purchase order.</p>
      <p>
        Employee: ${employee.fullName}<br/>
        Employee ID: ${employee.employeeNumber}<br/>
        Job title: ${employee.role}<br/>
        Department: ${employee.department}<br/>
        Location: ${employee.location}<br/>
        Start date: ${employee.startDate}<br/>
        Decision due: ${dueDate}
      </p>
      <p><a href="/oneflow/tasks/${taskId}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Open Task</a></p>
    </div>`,
    sentAt: nowIso(),
    readAt: null,
    status: "Unread",
    employeeId: employee.id,
    onboardingCaseId: caseId,
    responsibleTeam: "Hiring Manager",
    sourceType: "Laptop Request",
    sourceRecordId: requestId,
    relatedTaskId: taskId,
    notificationType: "Laptop Manager Decision",
  };
}

function findLaptopManagerNotification(
  uow: UnitOfWork,
  args: {
    to: string;
    sourceRecordId: string;
    relatedTaskId?: string | null;
  }
): MockEmail | undefined {
  return uow.mockEmails.list().find((e) => {
    if (!emailEq(e.to, args.to)) return false;
    if (e.notificationType === "Laptop Manager Decision") {
      if (e.sourceRecordId === args.sourceRecordId) return true;
      if (args.relatedTaskId && e.relatedTaskId === args.relatedTaskId) return true;
    }
    if (
      /Action Required:\s*Laptop Requirement/i.test(e.subject) &&
      (e.sourceRecordId === args.sourceRecordId ||
        e.relatedTaskId === args.relatedTaskId ||
        (args.relatedTaskId && e.htmlBody?.includes(args.relatedTaskId)))
    ) {
      return true;
    }
    return false;
  });
}

/** Seed package pieces for Alicia laptop workflow (Awaiting Manager Decision). */
export function buildAliciaLaptopSeed(employee: Employee, caseId: string) {
  const request = blankRequest(employee, caseId, {
    requestId: ALICIA_LAPTOP_REQUEST_ID,
    managerTaskId: ALICIA_LAPTOP_MANAGER_TASK_ID,
  });
  const task = managerDecisionTask(
    employee,
    caseId,
    request.id,
    ALICIA_LAPTOP_MANAGER_TASK_ID
  );
  const email = managerDecisionEmail({
    employee,
    caseId,
    taskId: task.id,
    requestId: request.id,
    dueDate: task.dueDate,
    emailId: ALICIA_LAPTOP_MANAGER_EMAIL_ID,
  });
  return {
    request,
    task,
    email,
    activity: {
      id: "act-alicia-laptop-seed",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: "OneFlow Automation",
      action: "Laptop requirement decision requested",
      detail: `Manager decision task created for ${employee.managerEmail}`,
    },
  };
}

/**
 * Idempotent laptop workflow bootstrap for any active onboarding case.
 * Creates one LaptopRequest, one open manager decision task, and one manager email.
 */
export function initializeLaptopRequestForOnboardingCase(
  uow: UnitOfWork,
  caseId: string,
  options?: { forceReset?: boolean; actor?: string }
): {
  ok: true;
  created: string[];
  repaired: string[];
  warnings: string[];
  requestId: string | null;
} | { ok: false; error: string; warnings: string[] } {
  const created: string[] = [];
  const repaired: string[] = [];
  const warnings: string[] = [];

  const onb = uow.onboardingCases.getById(caseId);
  if (!onb) {
    return { ok: false, error: "Onboarding case not found.", warnings };
  }
  if (["Completed", "Cancelled"].includes(onb.status)) {
    return {
      ok: true,
      created,
      repaired,
      warnings: ["Onboarding case is not active — laptop init skipped."],
      requestId: null,
    };
  }

  const employee = uow.employees.getById(onb.employeeId);
  if (!employee) {
    return { ok: false, error: "Employee not found for onboarding case.", warnings };
  }

  const templateEnabled = uow.checklistTemplates
    .list()
    .some(
      (t) =>
        t.active &&
        (t.id === "tmpl-laptop-decision" ||
          t.title === "Laptop Requirement Decision")
    );
  if (!templateEnabled) {
    warnings.push("Laptop Requirement Decision template is disabled.");
    return { ok: true, created, repaired, warnings, requestId: null };
  }

  const eligibleStatus =
    employee.employmentStatus === "New Hire" ||
    employee.employmentStatus === "Preboarding" ||
    employee.employmentStatus === "Active";
  if (!eligibleStatus && employee.id !== ALICIA_EMPLOYEE_ID) {
    warnings.push(
      `Employee status ${employee.employmentStatus} is not eligible for laptop init.`
    );
    return { ok: true, created, repaired, warnings, requestId: null };
  }

  if (!employee.managerEmail?.trim()) {
    const msg = `Manager email unresolved for ${employee.fullName} — laptop task not created.`;
    warnings.push(msg);
    uow.automationRuns.create({
      id: uid("run-laptop-warn"),
      runNumber: `LAPTOP-${Date.now().toString(36).toUpperCase()}`,
      trigger: "Laptop Request Initialization",
      employeeId: employee.id,
      onboardingCaseId: caseId,
      status: "Failed",
      startedAt: nowIso(),
      endedAt: nowIso(),
      durationMs: 0,
      tasksAssigned: 0,
      emailsGenerated: 0,
      errorMessage: msg,
      steps: [
        {
          id: uid("step"),
          order: 1,
          name: "Initialize laptop request",
          status: "Failed",
          detail: msg,
          startedAt: nowIso(),
          completedAt: nowIso(),
        },
      ],
      simulateFailure: false,
    });
    uow.onboardingCases.update({
      ...onb,
      lastWorkflowError: msg,
      updatedAt: nowIso(),
    });
    uow.activity.create({
      id: uid("act-laptop-mgr-missing"),
      employeeId: employee.id,
      onboardingCaseId: caseId,
      timestamp: nowIso(),
      actor: options?.actor || "OneFlow Automation",
      action: "Laptop init blocked — manager email missing",
      detail: msg,
    });
    uow.persist();
    return { ok: true, created, repaired, warnings, requestId: null };
  }

  const isAlicia = employee.id === ALICIA_EMPLOYEE_ID;
  const requestId = isAlicia
    ? ALICIA_LAPTOP_REQUEST_ID
    : `laptop-request-${caseId}`;
  const managerTaskId = isAlicia
    ? ALICIA_LAPTOP_MANAGER_TASK_ID
    : `task-laptop-decision-${caseId}`;
  const emailId = isAlicia
    ? ALICIA_LAPTOP_MANAGER_EMAIL_ID
    : `mail-laptop-decision-${caseId}`;

  let existing = uow.laptopRequests.getByCaseId(caseId) ||
    uow.laptopRequests.getById(requestId);

  if (options?.forceReset || !existing) {
    if (options?.forceReset && existing) {
      // remove related open tasks/emails for this request
      const keepTasks = uow.tasks
        .list()
        .filter(
          (t) =>
            !(
              t.linkedLaptopRequestId === existing!.id ||
              t.id === existing!.managerTaskId ||
              (t.isLaptopDecisionTask && t.onboardingCaseId === caseId)
            )
        );
      uow.tasks.replaceAll(keepTasks);
      const keepEmails = uow.mockEmails
        .list()
        .filter(
          (e) =>
            !(
              e.sourceRecordId === existing!.id ||
              e.notificationType === "Laptop Manager Decision" &&
                e.employeeId === employee.id
            )
        );
      uow.mockEmails.replaceAll(keepEmails);
      uow.laptopRequests.replaceAll(
        uow.laptopRequests.list().filter((r) => r.id !== existing!.id)
      );
      existing = undefined;
    }
    if (!existing) {
      const request = blankRequest(employee, caseId, {
        requestId,
        managerTaskId,
      });
      uow.laptopRequests.create(request);
      existing = request;
      created.push("Laptop request created");
    }
  } else {
    const patched = {
      ...existing,
      id: isAlicia ? ALICIA_LAPTOP_REQUEST_ID : existing.id,
      onboardingCaseId: caseId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
      managerName: employee.managerName || existing.managerName,
      managerEmail: employee.managerEmail,
      managerTaskId: existing.managerTaskId || managerTaskId,
      updatedAt: nowIso(),
    };
    if (patched.id !== existing.id) {
      uow.laptopRequests.replaceAll([
        patched,
        ...uow.laptopRequests.list().filter((r) => r.id !== existing!.id),
      ]);
      repaired.push("Laptop request ID normalized");
    } else {
      uow.laptopRequests.update(patched);
    }
    existing = patched;
  }

  // Deduplicate laptop requests for this case
  const caseReqs = uow.laptopRequests
    .list()
    .filter((r) => r.onboardingCaseId === caseId || r.employeeId === employee.id);
  if (caseReqs.length > 1) {
    const keep =
      caseReqs.find((r) => r.id === requestId) ||
      caseReqs.find((r) => r.requestStatus === "Awaiting Manager Decision") ||
      caseReqs[0];
    uow.laptopRequests.replaceAll([
      keep,
      ...uow.laptopRequests
        .list()
        .filter((r) => r.onboardingCaseId !== caseId && r.employeeId !== employee.id),
    ]);
    existing = keep;
    repaired.push("Duplicate laptop requests removed");
  }

  // Manager task — do not recreate if already completed unless forceReset
  let managerTask =
    (existing.managerTaskId
      ? uow.tasks.getById(existing.managerTaskId)
      : undefined) ||
    uow.tasks
      .list()
      .find(
        (t) =>
          t.isLaptopDecisionTask &&
          t.onboardingCaseId === caseId &&
          t.employeeId === employee.id
      );

  const requestOpen =
    existing.requestStatus === "Awaiting Manager Decision" ||
    existing.laptopRequired === null;

  if (
    managerTask &&
    (managerTask.status === "Completed" || managerTask.status === "Cancelled") &&
    requestOpen &&
    !options?.forceReset
  ) {
    // Request still awaiting but task closed — reopen for repair
    managerTask = {
      ...managerTask,
      id: isAlicia ? ALICIA_LAPTOP_MANAGER_TASK_ID : managerTask.id,
      status: "Pending",
      outcome: "None",
      completedAt: null,
      assignedEmail: employee.managerEmail,
      assignedPersonName: employee.managerName,
      assignedUserName: employee.managerName,
      linkedLaptopRequestId: existing.id,
      sourceRecordId: existing.id,
      sourceType: "Workflow",
      onboardingCaseId: caseId,
      lifecycleCaseId: caseId,
      isLaptopDecisionTask: true,
    };
    uow.tasks.update(managerTask);
    repaired.push("Manager laptop task reopened");
  } else if (!managerTask && requestOpen) {
    managerTask = managerDecisionTask(
      employee,
      caseId,
      existing.id,
      managerTaskId
    );
    uow.tasks.createMany([managerTask]);
    created.push("Manager laptop decision task created");
  } else if (managerTask) {
    const nextTask = {
      ...managerTask,
      id: isAlicia ? ALICIA_LAPTOP_MANAGER_TASK_ID : managerTask.id,
      assignedEmail: employee.managerEmail || managerTask.assignedEmail,
      assignedPersonName: employee.managerName || managerTask.assignedPersonName,
      assignedUserName: employee.managerName || managerTask.assignedUserName,
      linkedLaptopRequestId: existing.id,
      sourceRecordId: existing.id,
      sourceType: "Workflow" as const,
      onboardingCaseId: caseId,
      lifecycleCaseId: caseId,
      isLaptopDecisionTask: true,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
    };
    if (nextTask.id !== managerTask.id) {
      uow.tasks.replaceAll([
        nextTask,
        ...uow.tasks.list().filter((t) => t.id !== managerTask!.id),
      ]);
      repaired.push("Manager laptop task ID normalized");
    } else {
      uow.tasks.update(nextTask);
      repaired.push("Manager laptop task links repaired");
    }
    managerTask = nextTask;
  }

  // Deduplicate open manager decision tasks
  const openDecisionTasks = uow.tasks.list().filter(
    (t) =>
      t.isLaptopDecisionTask &&
      t.employeeId === employee.id &&
      t.onboardingCaseId === caseId &&
      t.status !== "Completed" &&
      t.status !== "Cancelled"
  );
  if (openDecisionTasks.length > 1 && managerTask) {
    uow.tasks.replaceAll([
      managerTask,
      ...uow.tasks
        .list()
        .filter(
          (t) =>
            !(
              t.isLaptopDecisionTask &&
              t.employeeId === employee.id &&
              t.onboardingCaseId === caseId &&
              t.id !== managerTask!.id
            )
        ),
    ]);
    repaired.push("Duplicate manager laptop tasks removed");
  }

  if (managerTask) {
    existing = {
      ...existing,
      managerTaskId: managerTask.id,
      updatedAt: nowIso(),
    };
    uow.laptopRequests.update(existing);
  }

  // Manager email — idempotent
  if (managerTask && requestOpen) {
    const existingEmail = findLaptopManagerNotification(uow, {
      to: employee.managerEmail,
      sourceRecordId: existing.id,
      relatedTaskId: managerTask.id,
    });
    if (!existingEmail) {
      const email = managerDecisionEmail({
        employee,
        caseId,
        taskId: managerTask.id,
        requestId: existing.id,
        dueDate: managerTask.dueDate,
        emailId,
      });
      uow.mockEmails.createMany([email]);
      created.push("Manager laptop email created");
    } else {
      const patched = {
        ...existingEmail,
        id: isAlicia ? ALICIA_LAPTOP_MANAGER_EMAIL_ID : existingEmail.id,
        to: employee.managerEmail,
        relatedTaskId: managerTask.id,
        sourceRecordId: existing.id,
        sourceType: "Laptop Request",
        notificationType: "Laptop Manager Decision",
        onboardingCaseId: caseId,
        htmlBody: existingEmail.htmlBody.includes(managerTask.id)
          ? existingEmail.htmlBody
          : managerDecisionEmail({
              employee,
              caseId,
              taskId: managerTask.id,
              requestId: existing.id,
              dueDate: managerTask.dueDate,
              emailId: existingEmail.id,
            }).htmlBody,
      };
      uow.mockEmails.replaceAll(
        uow.mockEmails.list().map((e) => (e.id === existingEmail.id ? patched : e))
      );
      repaired.push("Manager laptop email links repaired");
    }
  }

  uow.persist();
  return {
    ok: true,
    created,
    repaired,
    warnings,
    requestId: existing.id,
  };
}

export function getLaptopRequest(uow: UnitOfWork, id: string) {
  return uow.laptopRequests.getById(id);
}

export function getLaptopRequestByCase(uow: UnitOfWork, caseId: string) {
  return uow.laptopRequests.getByCaseId(caseId);
}

export function getEmployeeSafeLaptopStatus(uow: UnitOfWork, caseId: string) {
  const req = uow.laptopRequests.getByCaseId(caseId);
  return {
    status: employeeSafeEquipmentStatus(req),
    estimatedReadiness: req?.estimatedDeliveryDate ?? null,
    requestId: req?.id ?? null,
  };
}

function canManagerAct(session: UserSession, req: LaptopRequest): boolean {
  if (session.role === "Admin") return true;
  if (session.role === "HIRING_MANAGER") {
    return emailEq(session.email, req.managerEmail);
  }
  return false;
}

function canProcurementAct(session: UserSession): boolean {
  return session.role === "Admin";
}

export function submitLaptopNotRequired(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  args: { reason: string; remarks?: string }
) {
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Laptop request not found." };
  if (!canManagerAct(session, req)) {
    return { ok: false as const, error: "Not authorized." };
  }
  if (!args.reason.trim()) {
    return { ok: false as const, error: "Decision reason is required." };
  }

  const reuse =
    /existing laptop|reassign|reuse/i.test(args.reason) ||
    args.reason === "Existing laptop will be reassigned";

  const next: LaptopRequest = {
    ...req,
    laptopRequired: reuse ? true : false,
    managerDecision: "No",
    managerDecisionReason: args.reason as LaptopNotRequiredReason,
    managerRemarks: args.remarks || "",
    requestStatus: reuse ? "Laptop Not Required" : "Laptop Not Required",
    equipmentPath: reuse ? "Reuse Existing Laptop" : "Not Required",
    laptopDecisionStage: reuse ? "Reuse Existing Laptop" : "Not Required",
    procurementStage: "Not Required",
    existingLaptopStatus: reuse ? "Existing Laptop Selected" : "",
    managerSubmittedAt: nowIso(),
    managerSubmittedBy: session.email,
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  if (req.managerTaskId) {
    const t = uow.tasks.getById(req.managerTaskId);
    if (t) {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Completed",
        outcome: "Decision Recorded",
        completedAt: nowIso(),
        completedBy: session.email,
        completedByName: session.name,
        remarks: args.remarks || args.reason,
      });
    }
  }

  // Cancel purchase-order branch only — keep Onsite preparation for reuse path
  for (const t of uow.tasks.list().filter((x) => x.onboardingCaseId === req.onboardingCaseId)) {
    if (
      (t.title.includes("Purchase Order") || t.isLaptopProcurementTask) &&
      t.status !== "Completed"
    ) {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Cancelled",
        outcome: "Not Required",
        completedAt: nowIso(),
        blocked: false,
        blockedReason: "Laptop not required",
      });
    }
    if (
      !reuse &&
      (t.title.includes("Prepare Laptop") || t.isLaptopPrepareTask) &&
      t.status !== "Completed"
    ) {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Cancelled",
        outcome: "Not Required",
        completedAt: nowIso(),
        blocked: false,
        blockedReason: "Laptop not required",
      });
    }
  }

  // If IT Security already complete, activate reuse preparation immediately
  if (reuse) {
    if (
      areItSecurityAccountTasksComplete(
        uow.tasks.listByCaseId(req.onboardingCaseId)
      )
    ) {
      ensureOnsiteEquipmentHandoff(uow, req.onboardingCaseId, {
        actor: session.name,
      });
      uow.mockEmails.createMany([
        {
          id: uid("mail-existing-prep"),
          automationRunId: "",
          from: "oneflow@ppg-demo.com",
          to: ONSITE_IT_SUPPORT_EMAIL,
          cc: [],
          subject: `Existing Laptop Preparation Required – ${req.employeeName}`,
          htmlBody: `<p>Please prepare an existing laptop for <strong>${req.employeeName}</strong>.</p>
            <p>Reason: ${args.reason}</p>
            <p><a href="/oneflow/my-tasks">Open My Tasks</a></p>`,
          sentAt: nowIso(),
          readAt: null,
          status: "Unread",
          employeeId: req.employeeId,
          onboardingCaseId: req.onboardingCaseId,
          responsibleTeam: "Onsite IT Support",
          notificationType: "Existing Laptop Preparation",
          sourceType: "Laptop Decision",
          sourceRecordId: req.id,
        },
      ]);
    }
  }

  uow.activity.create({
    id: uid("act-laptop-no"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Laptop not required",
    detail: `${session.name} recorded: ${args.reason}`,
  });
  uow.persist();
  return { ok: true as const, request: next };
}

export function submitLaptopRequired(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  args: {
    departmentCreditNumber: string;
    costCentre: string;
    laptopRequirementType: LaptopRequirementType;
    requiredDeliveryDate: string;
    businessJustification: string;
    requestedSpecification?: string;
    standardModelRequested?: string;
    managerRemarks?: string;
    lateDeliveryReason?: string;
  }
) {
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Laptop request not found." };
  if (!canManagerAct(session, req)) {
    return { ok: false as const, error: "Not authorized." };
  }

  const employee = uow.employees.getById(req.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  if (!args.departmentCreditNumber.trim()) {
    return { ok: false as const, error: "Department Credit Number is required." };
  }
  if (!args.costCentre.trim()) {
    return { ok: false as const, error: "Cost Centre is required." };
  }
  if (!args.laptopRequirementType) {
    return { ok: false as const, error: "Laptop Requirement Type is required." };
  }
  if (!args.businessJustification.trim()) {
    return { ok: false as const, error: "Business Justification is required." };
  }
  if (!args.requiredDeliveryDate) {
    return { ok: false as const, error: "Required Delivery Date is required." };
  }
  if (
    args.requiredDeliveryDate > employee.startDate &&
    !args.lateDeliveryReason?.trim()
  ) {
    return {
      ok: false as const,
      error:
        "Required delivery date is after start date — provide a reason or choose an earlier date.",
    };
  }
  if (
    args.laptopRequirementType === "Special Requirement" &&
    !args.requestedSpecification?.trim()
  ) {
    return {
      ok: false as const,
      error: "Requested Specification is required for Special Requirement.",
    };
  }

  // Prevent duplicate open procurement tasks
  const existingPo = uow.tasks
    .list()
    .find(
      (t) =>
        t.linkedLaptopRequestId === requestId &&
        t.isLaptopProcurementTask &&
        t.status !== "Completed" &&
        t.status !== "Cancelled"
    );

  const poTask =
    existingPo ||
    buildProcurementTask(employee, req.onboardingCaseId, requestId);

  const next: LaptopRequest = {
    ...req,
    laptopRequired: true,
    managerDecision: "Yes",
    managerDecisionReason: "",
    departmentCreditNumber: args.departmentCreditNumber.trim(),
    costCentre: args.costCentre.trim(),
    laptopRequirementType: args.laptopRequirementType,
    requiredDeliveryDate: args.requiredDeliveryDate,
    businessJustification: args.businessJustification.trim(),
    requestedSpecification: args.requestedSpecification || "",
    standardModelRequested: args.standardModelRequested || "",
    specialSpecificationRequired:
      args.laptopRequirementType === "Special Requirement",
    managerRemarks:
      [args.managerRemarks, args.lateDeliveryReason].filter(Boolean).join(" · ") ||
      "",
    requestStatus: "Awaiting PO",
    equipmentPath: "New Laptop Temporary Spare",
    laptopDecisionStage: "New Laptop Approved",
    procurementStage: "PO Creation",
    spareLaptopStatus: "New Laptop Purchase In Progress",
    onsiteItStage:
      req.itSecurityStage === "Provisioning Complete"
        ? "Preparing Spare Laptop"
        : req.onsiteItStage || "Awaiting Security Handoff",
    managerSubmittedAt: nowIso(),
    managerSubmittedBy: session.email,
    procurementTaskId: poTask.id,
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  if (req.managerTaskId) {
    const t = uow.tasks.getById(req.managerTaskId);
    if (t) {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Completed",
        outcome: "Approved",
        completedAt: nowIso(),
        completedBy: session.email,
        completedByName: session.name,
      });
    }
  }

  if (!existingPo) {
    uow.tasks.createMany([poTask]);
  }

  uow.mockEmails.createMany([
    {
      id: uid("mail-laptop-po"),
      automationRunId: "",
      from: "oneflow@ppg-demo.com",
      to: "admin@ppg-demo.com",
      cc: [],
      subject: `Laptop Purchase Order Required – ${employee.fullName}`,
      htmlBody: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
        <p>A laptop purchase order is required for ${employee.fullName}.</p>
        <p>
          Employee ID: ${employee.employeeNumber}<br/>
          Department: ${employee.department}<br/>
          Start date: ${employee.startDate}<br/>
          Credit number: ${next.departmentCreditNumber}<br/>
          Cost centre: ${next.costCentre}<br/>
          Requirement: ${next.laptopRequirementType}<br/>
          Specification: ${next.requestedSpecification || next.standardModelRequested || "Standard"}<br/>
          Justification: ${next.businessJustification}<br/>
          Required delivery: ${next.requiredDeliveryDate}<br/>
          Manager: ${next.managerName}
        </p>
        <p><a href="/oneflow/tasks/${poTask.id}">Open Task</a></p>
      </div>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "Administration",
    },
  ]);

  uow.activity.create({
    id: uid("act-laptop-yes"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Laptop required – procurement task created",
    detail: `Credit ${next.departmentCreditNumber} · ${next.laptopRequirementType}`,
  });

  // IT Security handoff / spare prep is independent of PO
  if (
    areItSecurityAccountTasksComplete(
      uow.tasks.listByCaseId(req.onboardingCaseId)
    )
  ) {
    ensureOnsiteEquipmentHandoff(uow, req.onboardingCaseId, {
      actor: session.name,
    });
    uow.mockEmails.createMany([
      {
        id: uid("mail-spare-prep"),
        automationRunId: "",
        from: "oneflow@ppg-demo.com",
        to: ONSITE_IT_SUPPORT_EMAIL,
        cc: [],
        subject: `Spare Laptop Preparation Required – ${employee.fullName}`,
        htmlBody: `<p>A new laptop was approved for <strong>${employee.fullName}</strong>.</p>
          <p>Prepare a <strong>spare laptop</strong> for day one. Purchase order continues in parallel and must not block preparation.</p>
          <p><a href="/oneflow/my-tasks">Open My Tasks</a></p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: employee.id,
        onboardingCaseId: req.onboardingCaseId,
        responsibleTeam: "Onsite IT Support",
        notificationType: "Spare Laptop Preparation",
        sourceType: "Laptop Decision",
        sourceRecordId: req.id,
      },
    ]);
  }

  uow.persist();
  return { ok: true as const, request: next, procurementTaskId: poTask.id };
}

function buildProcurementTask(
  employee: Employee,
  caseId: string,
  requestId: string
): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 2,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "hr@ppg-demo.com",
    },
    assignedAt,
    false
  );
  return {
    id: ALICIA_LAPTOP_PO_TASK_ID,
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "Facilities Checklist",
    title: `Create Laptop Purchase Order – ${employee.fullName}`,
    description: "Create the purchase order based on the manager laptop request.",
    instructions:
      "Review manager request details and enter vendor, PO number and delivery estimate.",
    status: "Pending",
    priority: "High",
    assignedOwner: "OneFlow Admin",
    responsibleTeam: "Administration",
    assignedPersonName: "OneFlow Admin",
    assignedEmail: "admin@ppg-demo.com",
    assignedUserName: "OneFlow Admin",
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: addWorkingDays(nowIso().slice(0, 10), 2).toISOString().slice(0, 10),
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    dependencyTaskIds: [ALICIA_LAPTOP_MANAGER_TASK_ID],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 6,
    templateTaskId: "tmpl-laptop-po",
    taskType: "Action",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: requestId,
    linkedLaptopRequestId: requestId,
    isLaptopProcurementTask: true,
    ...reminder,
  };
}

export function saveProcurementDraft(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  patch: Partial<
    Pick<
      LaptopRequest,
      | "vendorName"
      | "quotationReference"
      | "purchaseOrderNumber"
      | "purchaseOrderDate"
      | "estimatedDeliveryDate"
      | "procurementRemarks"
    >
  >
) {
  if (!canProcurementAct(session)) {
    return { ok: false as const, error: "Admin only." };
  }
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Request not found." };
  const next = { ...req, ...patch, updatedAt: nowIso() };
  uow.laptopRequests.update(next);
  if (req.procurementTaskId) {
    const t = uow.tasks.getById(req.procurementTaskId);
    if (t && t.status === "Pending") {
      uow.tasks.update({ ...t, status: "In Progress" });
    }
  }
  uow.persist();
  return { ok: true as const, request: next };
}

export function confirmPurchaseOrder(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  patch: {
    vendorName: string;
    quotationReference?: string;
    purchaseOrderNumber: string;
    purchaseOrderDate: string;
    estimatedDeliveryDate: string;
    procurementRemarks?: string;
  }
) {
  if (!canProcurementAct(session)) {
    return { ok: false as const, error: "Admin only." };
  }
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Request not found." };
  if (!patch.vendorName.trim()) return { ok: false as const, error: "Vendor Name is required." };
  if (!patch.purchaseOrderNumber.trim()) {
    return { ok: false as const, error: "Purchase Order Number is required." };
  }
  if (!patch.purchaseOrderDate) {
    return { ok: false as const, error: "Purchase Order Date is required." };
  }
  if (!patch.estimatedDeliveryDate) {
    return { ok: false as const, error: "Estimated Delivery Date is required." };
  }

  const employee = uow.employees.getById(req.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  const prepare =
    uow.tasks.getById(req.onsiteITTaskId || "") ||
    buildPrepareTask(employee, req.onboardingCaseId, requestId, patch.estimatedDeliveryDate);

  const next: LaptopRequest = {
    ...req,
    vendorName: patch.vendorName.trim(),
    quotationReference: patch.quotationReference || "",
    purchaseOrderNumber: patch.purchaseOrderNumber.trim(),
    purchaseOrderDate: patch.purchaseOrderDate,
    estimatedDeliveryDate: patch.estimatedDeliveryDate,
    procurementRemarks: patch.procurementRemarks || "",
    requestStatus: "PO Created",
    procurementStage: "Ordered",
    spareLaptopStatus:
      req.spareLaptopStatus === "Spare Laptop Assigned"
        ? "Spare Laptop Assigned"
        : "New Laptop Purchase In Progress",
    procurementCompletedAt: nowIso(),
    procurementCompletedBy: session.email,
    onsiteITTaskId: prepare.id,
    // Do not set Awaiting Delivery as a global blocker — spare prep continues
    onsiteStatus: req.onsiteStatus || "Pending",
    onsiteItStage:
      req.onsiteItStage === "Awaiting Security Handoff"
        ? "Preparing Spare Laptop"
        : req.onsiteItStage || "Preparing Spare Laptop",
    equipmentPath: "New Laptop Temporary Spare",
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  if (req.procurementTaskId) {
    const t = uow.tasks.getById(req.procurementTaskId);
    if (t) {
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

  if (!uow.tasks.getById(prepare.id)) {
    uow.tasks.createMany([prepare]);
  } else {
    uow.tasks.update({
      ...prepare,
      status: prepare.status === "Completed" ? "Completed" : "Pending",
      blocked: false,
      blockedReason: null,
      dependencyTaskIds: uow.tasks
        .listByCaseId(req.onboardingCaseId)
        .filter((t) =>
          ["Create Network ID", "Create Email", "SailPoint Access"].includes(
            t.title
          )
        )
        .map((t) => t.id),
      unlockedAt: prepare.unlockedAt || nowIso(),
    });
  }

  // Never re-block Laptop Assigned on PO / prepare purchase wait
  for (const t of uow.tasks
    .list()
    .filter((x) => x.onboardingCaseId === req.onboardingCaseId)) {
    if (
      t.title === "Laptop Assigned" &&
      (t.blockedReason || "").toLowerCase().includes("purchase")
    ) {
      uow.tasks.update({
        ...t,
        blockedReason: t.blockedReason?.replace(/Waiting for:.*Purchase.*/i, "")
          ? null
          : t.blockedReason,
      });
    }
  }

  if (
    areItSecurityAccountTasksComplete(
      uow.tasks.listByCaseId(req.onboardingCaseId)
    )
  ) {
    ensureOnsiteEquipmentHandoff(uow, req.onboardingCaseId, {
      actor: session.name,
    });
  }

  uow.mockEmails.createMany([
    {
      id: uid("mail-po-mgr"),
      automationRunId: "",
      from: "admin@ppg-demo.com",
      to: req.managerEmail,
      cc: [],
      subject: `Laptop Purchase Order Created – ${employee.fullName}`,
      htmlBody: `<p>A purchase order has been created for ${employee.fullName}'s laptop.</p>
        <p>Estimated delivery: ${patch.estimatedDeliveryDate}</p>
        <p>Onsite IT is preparing a spare laptop for day one in parallel.</p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "Hiring Manager",
      notificationType: "New Laptop Approved",
    },
    {
      id: uid("mail-po-it"),
      automationRunId: "",
      from: "admin@ppg-demo.com",
      to: ONSITE_IT_SUPPORT_EMAIL,
      cc: [],
      subject: `Spare Laptop Preparation Required – ${employee.fullName}`,
      htmlBody: `<p>PO created for ${employee.fullName}. Continue spare laptop preparation for day one.</p>
        <p>Requirement: ${req.laptopRequirementType}<br/>
        Estimated new laptop delivery: ${patch.estimatedDeliveryDate}<br/>
        Start date: ${employee.startDate}</p>
        <p><a href="/oneflow/tasks/${prepare.id}">Open Preparation Task</a></p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "Onsite IT Support",
      notificationType: "Spare Laptop Preparation",
      relatedTaskId: prepare.id,
    },
    {
      id: uid("mail-po-emp"),
      automationRunId: "",
      from: "hr@ppg-demo.com",
      to: employee.email,
      cc: [],
      subject: "Equipment Preparation Update",
      htmlBody: `<p>Hello ${employee.fullName},</p>
        <p>Equipment is being prepared for your first day.</p>
        <p><a href="/oneflow/my-onboarding/${req.onboardingCaseId}">View My Onboarding</a></p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "HR Operations",
      notificationType: "Equipment Ready",
    },
  ]);

  uow.activity.create({
    id: uid("act-po"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Laptop PO created",
    detail: `PO ${patch.purchaseOrderNumber} · Spare prep continues in parallel`,
  });
  uow.persist();
  return { ok: true as const, request: next };
}

function buildPrepareTask(
  employee: Employee,
  caseId: string,
  requestId: string,
  estimatedDelivery: string
): ChecklistTask {
  const assignedAt = nowIso();
  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 3,
      escalationAfterWorkingDays: 3,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );
  return {
    id: ALICIA_LAPTOP_PREPARE_TASK_ID,
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "IT Checklist",
    title: `Prepare Laptop for ${employee.fullName}`,
    description:
      "Prepare equipment for the new hire after IT Security provisioning. Not blocked by purchase order.",
    instructions: `Required-by / estimated: ${estimatedDelivery}. Update status as the device progresses. Spare prep is not blocked by new laptop delivery.`,
    status: "Pending",
    priority: "High",
    assignedOwner: "Jason Lim",
    responsibleTeam: "Onsite IT Support",
    assignedPersonName: "Jason Lim",
    assignedEmail: ONSITE_IT_SUPPORT_EMAIL,
    assignedUserName: "Jason Lim",
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    department: employee.department,
    dueDate: estimatedDelivery,
    completedAt: null,
    notes: "",
    remarks: "",
    notificationStatus: "Simulated",
    notificationSentAt: assignedAt,
    reminderCount: 0,
    lastReminderAt: null,
    escalationStatus: "None",
    sourceSystem: "OneFlow",
    // Never depend on PO — IT Security completion unlocks preparation
    dependencyTaskIds: [],
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 7,
    templateTaskId: "tmpl-laptop-prepare",
    taskType: "Action",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: requestId,
    linkedLaptopRequestId: requestId,
    isLaptopPrepareTask: true,
    ...reminder,
  };
}

export function returnLaptopRequestToManager(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  reason: string
) {
  if (!canProcurementAct(session)) {
    return { ok: false as const, error: "Admin only." };
  }
  if (!reason.trim()) {
    return { ok: false as const, error: "Correction reason is required." };
  }
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Request not found." };
  const employee = uow.employees.getById(req.employeeId);
  if (!employee) return { ok: false as const, error: "Employee not found." };

  // Cancel open PO task if any
  if (req.procurementTaskId) {
    const po = uow.tasks.getById(req.procurementTaskId);
    if (po && po.status !== "Completed") {
      uow.tasks.update({
        ...stopAllReminders(po),
        status: "Cancelled",
        outcome: "Returned for Correction",
        remarks: reason,
        completedAt: nowIso(),
      });
    }
  }

  let managerTask = req.managerTaskId
    ? uow.tasks.getById(req.managerTaskId)
    : undefined;
  if (managerTask) {
    managerTask = {
      ...managerTask,
      status: "In Progress",
      outcome: "None",
      completedAt: null,
      remarks: reason,
      blocked: false,
      blockedReason: null,
    };
    uow.tasks.update(managerTask);
  } else {
    managerTask = managerDecisionTask(
      employee,
      req.onboardingCaseId,
      req.id,
      req.managerTaskId ||
        (employee.id === ALICIA_EMPLOYEE_ID
          ? ALICIA_LAPTOP_MANAGER_TASK_ID
          : uid("task-laptop-decision"))
    );
    uow.tasks.createMany([managerTask]);
  }

  const next: LaptopRequest = {
    ...req,
    requestStatus: "Awaiting Manager Decision",
    procurementTaskId: null,
    managerTaskId: managerTask.id,
    managerRemarks: reason,
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  uow.mockEmails.createMany([
    {
      id: uid("mail-laptop-corr"),
      automationRunId: "",
      from: "admin@ppg-demo.com",
      to: req.managerEmail,
      cc: [],
      subject: `Action Required: Laptop Request Correction – ${employee.fullName}`,
      htmlBody: `<p>Your laptop request was returned for correction.</p>
        <p>Reason: ${reason}</p>
        <p><a href="/oneflow/tasks/${managerTask.id}">Open Task</a></p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "Hiring Manager",
    },
  ]);

  uow.activity.create({
    id: uid("act-laptop-ret"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Laptop request returned to manager",
    detail: reason,
  });
  uow.persist();
  return { ok: true as const, request: next };
}

export function updateEquipmentPreparationStatus(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  status: NonNullable<LaptopRequest["onsiteStatus"]>
) {
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Request not found." };
  const teamOk =
    session.role === "Admin" ||
    session.role === "ONSITE_IT" ||
    emailEq(session.email, "itsupport@ppg-demo.com");
  if (!teamOk) return { ok: false as const, error: "Not authorized." };

  let requestStatus = req.requestStatus;
  if (status === "Awaiting Delivery") requestStatus = "Awaiting Delivery";
  if (status === "Device Received") requestStatus = "Delivered";
  if (status === "Configuration In Progress") requestStatus = "Ready for Configuration";
  if (status === "Ready for Collection" || status === "Completed") {
    requestStatus = "Completed";
  }

  let spareLaptopStatus = (req.spareLaptopStatus ||
    "") as NonNullable<LaptopRequest["spareLaptopStatus"]>;
  let existingLaptopStatus = (req.existingLaptopStatus ||
    "") as NonNullable<LaptopRequest["existingLaptopStatus"]>;
  let onsiteItStage = req.onsiteItStage || null;

  if (req.equipmentPath === "New Laptop Temporary Spare") {
    if (status === "Configuration In Progress") {
      spareLaptopStatus = "Spare Laptop Preparation";
      onsiteItStage = "Preparing Spare Laptop";
    }
    if (status === "Ready for Collection") {
      spareLaptopStatus = "Spare Laptop Assigned";
      onsiteItStage = "Ready for Employee";
    }
    if (status === "Device Received" && req.procurementStage === "Ordered") {
      spareLaptopStatus = "New Laptop Received";
    }
    if (status === "Completed") {
      spareLaptopStatus =
        spareLaptopStatus === "Laptop Replacement Scheduled" ||
        spareLaptopStatus === "New Laptop Received"
          ? "New Laptop Assigned"
          : "Spare Laptop Assigned";
      onsiteItStage = "Completed";
    }
  }

  if (req.equipmentPath === "Reuse Existing Laptop") {
    if (status === "Configuration In Progress") {
      existingLaptopStatus = "Reimage In Progress";
      onsiteItStage = "Preparing Existing Laptop";
    }
    if (status === "Ready for Collection") {
      existingLaptopStatus = "Ready for Assignment";
      onsiteItStage = "Ready for Employee";
    }
    if (status === "Completed") {
      existingLaptopStatus = "Existing Laptop Assigned";
      onsiteItStage = "Completed";
    }
  }

  const next: LaptopRequest = {
    ...req,
    onsiteStatus: status,
    requestStatus,
    spareLaptopStatus,
    existingLaptopStatus,
    onsiteItStage,
    procurementStage:
      status === "Device Received" || status === "Completed"
        ? req.managerDecision === "Yes"
          ? "Delivered"
          : req.procurementStage
        : req.procurementStage,
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  if (req.onsiteITTaskId) {
    const t = uow.tasks.getById(req.onsiteITTaskId);
    if (t) {
      const done = status === "Completed" || status === "Ready for Collection";
      uow.tasks.update({
        ...(done ? stopAllReminders(t) : t),
        status: done ? "Completed" : "In Progress",
        outcome: done ? "Completed" : "None",
        completedAt: done ? nowIso() : null,
        completedBy: done ? session.email : null,
        completedByName: done ? session.name : null,
        remarks: status,
      });
    }
  }

  // New laptop arrived after spare path — create replacement task
  if (
    status === "Device Received" &&
    req.equipmentPath === "New Laptop Temporary Spare" &&
    (req.spareLaptopStatus === "Spare Laptop Assigned" ||
      req.onsiteItStage === "Ready for Employee" ||
      req.onsiteItStage === "Completed")
  ) {
    ensureLaptopReplacementTask(uow, requestId);
  }

  if (status === "Completed" || status === "Ready for Collection") {
    uow.mockEmails.createMany([
      {
        id: uid("mail-equip-ready"),
        automationRunId: "",
        from: "oneflow@ppg-demo.com",
        to: "admin@ppg-demo.com",
        cc: [req.employeeEmail],
        subject: `Equipment Ready – ${req.employeeName}`,
        htmlBody: `<p>Equipment preparation is ready for <strong>${req.employeeName}</strong>.</p>
          <p>Employee-safe status: Equipment is being prepared for your first day / Temporary laptop prepared.</p>`,
        sentAt: nowIso(),
        readAt: null,
        status: "Unread",
        employeeId: req.employeeId,
        onboardingCaseId: req.onboardingCaseId,
        responsibleTeam: "Administration",
        notificationType: "Equipment Ready",
        sourceType: "Onsite IT Preparation",
        sourceRecordId: req.id,
      },
    ]);
  }

  uow.activity.create({
    id: uid("act-onsite-equip"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Equipment preparation status updated",
    detail: status,
  });
  uow.persist();
  return { ok: true as const, request: uow.laptopRequests.getById(requestId)! };
}

export function resetDemoLaptopRequest(
  uow: UnitOfWork,
  session: UserSession
) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const employee = uow.employees.getById(ALICIA_EMPLOYEE_ID);
  if (!employee) return { ok: false as const, error: "Alicia not found." };

  const seed = buildAliciaLaptopSeed(employee, ALICIA_ONBOARDING_CASE_ID);

  // Remove prior laptop workflow tasks for Alicia
  const keptTasks = uow.tasks
    .list()
    .filter(
      (t) =>
        !(
          t.employeeId === ALICIA_EMPLOYEE_ID &&
          (t.isLaptopDecisionTask ||
            t.isLaptopProcurementTask ||
            t.isLaptopPrepareTask ||
            t.linkedLaptopRequestId)
        )
    );
  uow.tasks.replaceAll([...keptTasks, seed.task]);

  const otherReqs = uow.laptopRequests
    .list()
    .filter((r) => r.employeeId !== ALICIA_EMPLOYEE_ID);
  uow.laptopRequests.replaceAll([seed.request, ...otherReqs]);

  // Refresh decision email (replace prior laptop emails for Alicia)
  const emails = uow.mockEmails
    .list()
    .filter(
      (e) =>
        !(
          e.employeeId === ALICIA_EMPLOYEE_ID &&
          (/Laptop Requirement/i.test(e.subject) ||
            /Laptop Purchase Order/i.test(e.subject) ||
            /Prepare Laptop/i.test(e.subject) ||
            /Equipment Preparation Update/i.test(e.subject) ||
            /Laptop Request Correction/i.test(e.subject))
        )
    );
  uow.mockEmails.replaceAll([seed.email, ...emails]);

  uow.activity.create({
    id: uid("act-laptop-reset"),
    employeeId: ALICIA_EMPLOYEE_ID,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    timestamp: nowIso(),
    actor: session.name,
    action: "Alicia laptop request reset",
    detail: "Presentation demo: laptop workflow restored to Awaiting Manager Decision",
  });
  uow.persist();
  return { ok: true as const, request: seed.request };
}

export function submitDemoLaptopRequest(
  uow: UnitOfWork,
  session: UserSession
) {
  const req =
    uow.laptopRequests.getById(ALICIA_LAPTOP_REQUEST_ID) ||
    uow.laptopRequests.getByCaseId(ALICIA_ONBOARDING_CASE_ID);
  if (!req) return { ok: false as const, error: "Request not found." };
  const employee = uow.employees.getById(req.employeeId);
  const delivery = employee
    ? addWorkingDays(employee.startDate, -3).toISOString().slice(0, 10)
    : nowIso().slice(0, 10);
  return submitLaptopRequired(uow, session, req.id, {
    departmentCreditNumber: LAPTOP_DEMO.departmentCreditNumber,
    costCentre: LAPTOP_DEMO.costCentre,
    laptopRequirementType: LAPTOP_DEMO.laptopRequirementType,
    requiredDeliveryDate: delivery,
    businessJustification: LAPTOP_DEMO.businessJustification,
    standardModelRequested: "PPG Standard Business Laptop",
  });
}

export function cancelLaptopRequest(
  uow: UnitOfWork,
  session: UserSession,
  requestId: string,
  reason: string
) {
  if (!canProcurementAct(session)) {
    return { ok: false as const, error: "Admin only." };
  }
  if (!reason.trim()) {
    return { ok: false as const, error: "Cancel reason is required." };
  }
  const req = uow.laptopRequests.getById(requestId);
  if (!req) return { ok: false as const, error: "Request not found." };

  const next: LaptopRequest = {
    ...req,
    requestStatus: "Cancelled",
    procurementRemarks: reason.trim(),
    updatedAt: nowIso(),
  };
  uow.laptopRequests.update(next);

  for (const id of [
    req.managerTaskId,
    req.procurementTaskId,
    req.onsiteITTaskId,
  ]) {
    if (!id) continue;
    const t = uow.tasks.getById(id);
    if (t && t.status !== "Completed") {
      uow.tasks.update({
        ...stopAllReminders(t),
        status: "Cancelled",
        outcome: "Cancelled",
        remarks: reason,
        completedAt: nowIso(),
      });
    }
  }

  uow.activity.create({
    id: uid("act-laptop-cancel"),
    employeeId: req.employeeId,
    onboardingCaseId: req.onboardingCaseId,
    timestamp: nowIso(),
    actor: session.name,
    action: "Laptop request cancelled",
    detail: reason,
  });
  uow.persist();
  return { ok: true as const, request: next };
}

export function simulateMissingCreditNumber(
  uow: UnitOfWork,
  session: UserSession
) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const reset = resetDemoLaptopRequest(uow, session);
  if (!reset.ok) return reset;
  const mgr = {
    ...session,
    role: "HIRING_MANAGER" as const,
    email: "manager@ppg-demo.com",
    name: "Sarah Tan",
  };
  const employee = uow.employees.getById(ALICIA_EMPLOYEE_ID);
  const delivery = employee
    ? addWorkingDays(employee.startDate, -3).toISOString().slice(0, 10)
    : nowIso().slice(0, 10);
  return submitLaptopRequired(uow, mgr, ALICIA_LAPTOP_REQUEST_ID, {
    departmentCreditNumber: "INVALID-CREDIT",
    costCentre: LAPTOP_DEMO.costCentre,
    laptopRequirementType: LAPTOP_DEMO.laptopRequirementType,
    requiredDeliveryDate: delivery,
    businessJustification: LAPTOP_DEMO.businessJustification,
    standardModelRequested: "PPG Standard Business Laptop",
  });
}

export function simulateManagerDelay(uow: UnitOfWork, session: UserSession) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const reset = resetDemoLaptopRequest(uow, session);
  if (!reset.ok) return reset;
  const task = uow.tasks.getById(ALICIA_LAPTOP_MANAGER_TASK_ID);
  if (task) {
    const overdue = addWorkingDays(new Date(), -2).toISOString().slice(0, 10);
    uow.tasks.update({
      ...task,
      dueDate: overdue,
      status: "Overdue",
      assignedAt: addWorkingDays(new Date(), -4).toISOString(),
    });
  }
  uow.activity.create({
    id: uid("act-mgr-delay"),
    employeeId: ALICIA_EMPLOYEE_ID,
    onboardingCaseId: ALICIA_ONBOARDING_CASE_ID,
    timestamp: nowIso(),
    actor: session.name,
    action: "Simulated manager delay",
    detail: "Laptop decision task marked overdue for demo",
  });
  uow.persist();
  return { ok: true as const, request: reset.request };
}

export function advanceDemoLaptopTime(uow: UnitOfWork, session: UserSession) {
  if (session.role !== "Admin") {
    return { ok: false as const, error: "Admin only." };
  }
  const req = uow.laptopRequests.getByCaseId(ALICIA_ONBOARDING_CASE_ID);
  if (!req) return { ok: false as const, error: "Request not found." };
  for (const id of [req.managerTaskId, req.procurementTaskId, req.onsiteITTaskId]) {
    if (!id) continue;
    const t = uow.tasks.getById(id);
    if (t && t.status !== "Completed" && t.status !== "Cancelled") {
      uow.tasks.update({
        ...t,
        dueDate: addWorkingDays(new Date(), -1).toISOString().slice(0, 10),
        status: t.status === "Blocked" ? t.status : "Overdue",
      });
    }
  }
  uow.persist();
  return { ok: true as const, request: req };
}

export function populateDemoPO(uow: UnitOfWork, session: UserSession) {
  const req =
    uow.laptopRequests.getById(ALICIA_LAPTOP_REQUEST_ID) ||
    uow.laptopRequests.getByCaseId(ALICIA_ONBOARDING_CASE_ID);
  if (!req) return { ok: false as const, error: "Request not found." };
  const employee = uow.employees.getById(req.employeeId);
  const est = employee
    ? addWorkingDays(employee.startDate, -2).toISOString().slice(0, 10)
    : nowIso().slice(0, 10);
  return saveProcurementDraft(uow, session, req.id, {
    vendorName: LAPTOP_DEMO.vendorName,
    quotationReference: LAPTOP_DEMO.quotationReference,
    purchaseOrderNumber: LAPTOP_DEMO.purchaseOrderNumber,
    purchaseOrderDate: nowIso().slice(0, 10),
    estimatedDeliveryDate: est,
    procurementRemarks: "Demo PO populated",
  });
}
