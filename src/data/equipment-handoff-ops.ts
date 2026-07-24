/**
 * Onsite IT equipment preparation handoff after IT Security provisioning.
 * Decoupled from purchase order / delivery.
 */

import type { UnitOfWork } from "./repositories/interfaces";
import type { ChecklistTask, Employee } from "./types";
import { initReminderFieldsFromTemplate, restartRemindersFromUnlock } from "./automation/reminder-engine";
import {
  areItSecurityAccountTasksComplete,
  buildAccountIdentityFields,
  IT_SECURITY_ACCOUNT_TASKS,
} from "./automation/account-created-workflow";
import {
  buildSailPointHandoffEmail,
  hasSuccessfulSailPointHandoff,
  isPrepareLaptopTask,
  ONSITE_IT_SUPPORT_EMAIL,
  syncLaptopRequestStages,
} from "./automation/sailpoint-handoff";
import {
  ALICIA_LAPTOP_PREPARE_TASK_ID,
  ALICIA_LAPTOP_REPLACEMENT_TASK_ID,
  ALICIA_SAILPOINT_HANDOFF_EMAIL_ID,
  deriveEquipmentPath,
  deriveLaptopDecisionStage,
  deriveProcurementStage,
  type LaptopRequest,
  type OnsiteItEquipmentStage,
} from "./laptop-request-types";
import { ALICIA_EMPLOYEE_ID } from "./alicia-types";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function itSecurityTaskIds(caseTasks: ChecklistTask[]): string[] {
  return IT_SECURITY_ACCOUNT_TASKS.map(
    (title) => caseTasks.find((t) => t.title === title)?.id
  ).filter(Boolean) as string[];
}

/** Rewrite Prepare / Laptop Assigned deps so PO never blocks Onsite IT handoff. */
export function repairEquipmentTaskDependencies(
  uow: UnitOfWork,
  caseId: string
): { repaired: number } {
  const caseTasks = uow.tasks.listByCaseId(caseId);
  const securityIds = itSecurityTaskIds(caseTasks);
  const prepare = caseTasks.find(isPrepareLaptopTask);
  let repaired = 0;

  for (const t of caseTasks) {
    if (isPrepareLaptopTask(t)) {
      const nextDeps = securityIds;
      const unmet = nextDeps.filter((id) => {
        const p = caseTasks.find((x) => x.id === id);
        return !p || p.status !== "Completed";
      });
      const shouldUnlock =
        unmet.length === 0 &&
        areItSecurityAccountTasksComplete(caseTasks) &&
        (t.status === "Blocked" ||
          (t.blockedReason || "").toLowerCase().includes("purchase") ||
          (t.blockedReason || "").toLowerCase().includes("purchase order") ||
          (t.dependencyTaskIds || []).some((id) => {
            const d = caseTasks.find((x) => x.id === id);
            return d?.isLaptopProcurementTask || /purchase order/i.test(d?.title || "");
          }));

      const patched: ChecklistTask = {
        ...t,
        dependencyTaskIds: nextDeps,
        ...(shouldUnlock
          ? {
              status: t.status === "Completed" ? t.status : ("Pending" as const),
              blockedReason: null,
              blocked: false,
              unlockedAt: t.unlockedAt || nowIso(),
            }
          : unmet.length
            ? {
                status: "Blocked" as const,
                blockedReason: `Waiting for: ${unmet
                  .map((id) => caseTasks.find((x) => x.id === id)?.title || id)
                  .join(", ")}`,
              }
            : {
                blockedReason:
                  t.status === "Blocked" ? null : t.blockedReason,
                status:
                  t.status === "Blocked" && !unmet.length
                    ? ("Pending" as const)
                    : t.status,
              }),
      };
      if (
        JSON.stringify(patched.dependencyTaskIds) !==
          JSON.stringify(t.dependencyTaskIds) ||
        patched.status !== t.status ||
        patched.blockedReason !== t.blockedReason
      ) {
        uow.tasks.update(
          shouldUnlock && patched.status === "Pending"
            ? restartRemindersFromUnlock(patched, patched.unlockedAt || nowIso())
            : patched
        );
        repaired += 1;
      }
    }

    if (t.title === "Laptop Assigned" && prepare) {
      const nextDeps = [...new Set([...securityIds, prepare.id])];
      const hasPoDep = (t.dependencyTaskIds || []).some((id) => {
        const d = caseTasks.find((x) => x.id === id);
        return d?.isLaptopProcurementTask || /purchase order/i.test(d?.title || "");
      });
      if (
        hasPoDep ||
        JSON.stringify([...(t.dependencyTaskIds || [])].sort()) !==
          JSON.stringify([...nextDeps].sort())
      ) {
        const unmet = nextDeps.filter((id) => {
          const p = caseTasks.find((x) => x.id === id);
          return !p || p.status !== "Completed";
        });
        uow.tasks.update({
          ...t,
          dependencyTaskIds: nextDeps,
          status: unmet.length
            ? "Blocked"
            : t.status === "Blocked"
              ? "Pending"
              : t.status,
          blockedReason: unmet.length
            ? `Waiting for: ${unmet
                .map((id) => caseTasks.find((x) => x.id === id)?.title || id)
                .join(", ")}`
            : null,
        });
        repaired += 1;
      }
    }
  }

  return { repaired };
}

function buildOrRefreshPrepareTask(
  uow: UnitOfWork,
  employee: Employee,
  caseId: string,
  request: LaptopRequest,
  securityIds: string[]
): ChecklistTask {
  const existing =
    (request.onsiteITTaskId && uow.tasks.getById(request.onsiteITTaskId)) ||
    uow.tasks.listByCaseId(caseId).find(isPrepareLaptopTask);

  const path = request.equipmentPath || deriveEquipmentPath(request);
  const title =
    employee.id === ALICIA_EMPLOYEE_ID || existing?.id === ALICIA_LAPTOP_PREPARE_TASK_ID
      ? existing?.title?.startsWith("Prepare")
        ? existing.title
        : `Prepare Laptop for ${employee.fullName}`
      : existing?.title || `Prepare Laptop for ${employee.fullName}`;

  const description =
    path === "New Laptop Temporary Spare"
      ? "Prepare a spare laptop for day one while the new laptop purchase continues in parallel."
      : path === "Reuse Existing Laptop"
        ? "Inspect, reimage and assign an existing laptop to the new hire."
        : "Review inventory and prepare equipment. Final device assignment awaits manager laptop decision.";

  const instructions =
    path === "New Laptop Temporary Spare"
      ? "Assign a spare asset for first day. Procurement of the new laptop is parallel and must not block this task."
      : path === "Reuse Existing Laptop"
        ? "Record asset number, wipe/reimage, install software, reassign asset, verify readiness."
        : "Equipment decision is still pending. You may review inventory; do not finalize assignment until the manager decides.";

  const assignedAt = nowIso();
  const due =
    request.requiredDeliveryDate ||
    employee.startDate ||
    assignedAt.slice(0, 10);

  if (existing) {
    const unlocked = areItSecurityAccountTasksComplete(
      uow.tasks.listByCaseId(caseId)
    );
    const patched: ChecklistTask = {
      ...existing,
      title: existing.title.includes("Prepare")
        ? existing.title
        : title,
      description,
      instructions,
      dependencyTaskIds: securityIds,
      linkedLaptopRequestId: request.id,
      isLaptopPrepareTask: true,
      responsibleTeam: "Onsite IT Support",
      assignedEmail: ONSITE_IT_SUPPORT_EMAIL,
      ...(unlocked && existing.status === "Blocked"
        ? {
            status: "Pending" as const,
            blockedReason: null,
            blocked: false,
            unlockedAt: assignedAt,
          }
        : unlocked && existing.status === "Cancelled"
          ? {
              status: "Pending" as const,
              blockedReason: null,
              blocked: false,
              unlockedAt: assignedAt,
              outcome: "None" as const,
              completedAt: null,
            }
          : {}),
    };
    uow.tasks.update(
      patched.status === "Pending" && existing.status === "Blocked"
        ? restartRemindersFromUnlock(patched, assignedAt)
        : patched
    );
    return patched;
  }

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

  const taskId =
    employee.id === ALICIA_EMPLOYEE_ID
      ? ALICIA_LAPTOP_PREPARE_TASK_ID
      : uid("tsk-laptop-prepare");

  const task: ChecklistTask = {
    id: taskId,
    employeeId: employee.id,
    onboardingCaseId: caseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: caseId,
    group: "IT Checklist",
    title: `Prepare Laptop for ${employee.fullName}`,
    description,
    instructions,
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
    dependencyTaskIds: securityIds,
    blockedReason: null,
    blocked: false,
    unlockedAt: assignedAt,
    required: true,
    sortOrder: 38,
    templateTaskId: "tmpl-laptop-prepare",
    taskType: "Action",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: request.id,
    linkedLaptopRequestId: request.id,
    isLaptopPrepareTask: true,
    ...reminder,
  };
  uow.tasks.createMany([task]);
  return task;
}

function onsiteStageForPath(
  path: LaptopRequest["equipmentPath"]
): OnsiteItEquipmentStage {
  if (path === "New Laptop Temporary Spare") return "Preparing Spare Laptop";
  if (path === "Reuse Existing Laptop") return "Preparing Existing Laptop";
  return "Preparation Ready";
}

export type EquipmentHandoffResult = {
  triggered: boolean;
  prepareTaskId?: string;
  emailId?: string | null;
  emailSkipped?: boolean;
  messages: string[];
};

/**
 * After IT Security provisioning completes: activate Onsite IT prep + SailPoint handoff email.
 * Idempotent. Does not depend on manager laptop decision or PO.
 */
export function ensureOnsiteEquipmentHandoff(
  uow: UnitOfWork,
  caseId: string,
  options?: { forceResendEmail?: boolean; actor?: string }
): EquipmentHandoffResult {
  const messages: string[] = [];
  const onb = uow.onboardingCases.getById(caseId);
  if (!onb) return { triggered: false, messages: ["Case not found"] };

  const caseTasks = uow.tasks.listByCaseId(caseId);
  if (!areItSecurityAccountTasksComplete(caseTasks)) {
    return {
      triggered: false,
      messages: ["IT Security provisioning not complete"],
    };
  }

  repairEquipmentTaskDependencies(uow, caseId);

  const employee = uow.employees.getById(onb.employeeId);
  if (!employee) return { triggered: false, messages: ["Employee not found"] };

  let req = uow.laptopRequests.list().find((r) => r.onboardingCaseId === caseId);
  const identity = buildAccountIdentityFields(employee);
  const path = req ? deriveEquipmentPath(req) : "Decision Pending";
  const securityIds = itSecurityTaskIds(uow.tasks.listByCaseId(caseId));

  if (!req) {
    // Minimal stub so Onsite IT still has a linked request record
    const requestId = uid("laptop-req");
    req = {
      id: requestId,
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
      managerTaskId: null,
      procurementTaskId: null,
      onsiteStatus: "Pending",
      equipmentPath: "Decision Pending",
      itSecurityStage: "Provisioning Complete",
      laptopDecisionStage: "Pending Manager Decision",
      procurementStage: "Not Required",
      onsiteItStage: "Preparation Ready",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    uow.laptopRequests.create(req);
    messages.push("Laptop request record created for equipment handoff");
  }

  const prepare = buildOrRefreshPrepareTask(
    uow,
    employee,
    caseId,
    req,
    securityIds
  );
  messages.push(`Onsite IT preparation task ready: ${prepare.id}`);

  let onsiteItStage = onsiteStageForPath(path);
  if (req.onsiteItStage === "Completed") onsiteItStage = "Completed";
  if (req.onsiteItStage === "Replacement Pending") {
    onsiteItStage = "Replacement Pending";
  }

  const nextReq = syncLaptopRequestStages({
    ...req,
    onsiteITTaskId: prepare.id,
    itSecurityStage: "Provisioning Complete",
    equipmentPath: path,
    laptopDecisionStage: deriveLaptopDecisionStage(req),
    procurementStage: deriveProcurementStage(req),
    onsiteItStage,
    onsiteStatus: req.onsiteStatus || "Pending",
    networkIdSnapshot: identity.networkLoginId,
    companyEmailSnapshot: identity.workEmail,
    sailpointProvisioningStatus: "Complete",
    softwareRequirements:
      req.softwareRequirements ||
      "Microsoft 365, PPG VPN, required line-of-business apps",
    specialEquipmentNotes: req.specialEquipmentNotes || "",
    spareLaptopStatus:
      path === "New Laptop Temporary Spare"
        ? req.spareLaptopStatus || "Spare Laptop Preparation"
        : req.spareLaptopStatus || "",
    existingLaptopStatus:
      path === "Reuse Existing Laptop"
        ? req.existingLaptopStatus || "Existing Laptop Selected"
        : req.existingLaptopStatus || "",
    securityHandoffAt: req.securityHandoffAt || nowIso(),
    updatedAt: nowIso(),
  });

  const force = Boolean(options?.forceResendEmail);
  const emails = uow.mockEmails.list();
  const alreadyOk =
    !force && hasSuccessfulSailPointHandoff(emails, caseId);
  let emailId: string | null = nextReq.securityHandoffEmailId || null;
  let emailSkipped = false;

  if (alreadyOk) {
    emailSkipped = true;
    messages.push("SailPoint handoff notification already delivered — not resent");
  } else {
    emailId =
      employee.id === ALICIA_EMPLOYEE_ID
        ? ALICIA_SAILPOINT_HANDOFF_EMAIL_ID
        : uid("mail-sailpoint-handoff");
    // Replace prior failed handoff with same id if present
    const existing = uow.mockEmails.getById(emailId);
    const mail = buildSailPointHandoffEmail({
      employee,
      onboardingCaseId: caseId,
      automationRunId: "",
      emailId,
      laptopRequest: nextReq,
      prepareTaskId: prepare.id,
    });
    if (existing) {
      uow.mockEmails.update({
        ...mail,
        deliveryStatus: "Pending",
        failureReason: null,
        providerMessageId: null,
      });
    } else {
      uow.mockEmails.createMany([mail]);
    }
    messages.push(
      `SailPoint handoff notification → ${ONSITE_IT_SUPPORT_EMAIL}`
    );
  }

  uow.laptopRequests.update({
    ...nextReq,
    securityHandoffEmailId: emailId,
    securityHandoffAt: nextReq.securityHandoffAt || nowIso(),
  });

  // Ensure Laptop Assigned is not blocked by PO wording
  repairEquipmentTaskDependencies(uow, caseId);

  uow.activity.create({
    id: uid("act-equip-handoff"),
    employeeId: employee.id,
    onboardingCaseId: caseId,
    timestamp: nowIso(),
    actor: options?.actor || "OneFlow Automation",
    action: "IT Security provisioning complete — Onsite IT handoff",
    detail: messages.join(" · "),
  });

  return {
    triggered: true,
    prepareTaskId: prepare.id,
    emailId,
    emailSkipped,
    messages,
  };
}

/** When new laptop is delivered after spare was assigned — create replacement task. */
export function ensureLaptopReplacementTask(
  uow: UnitOfWork,
  requestId: string
): { created: boolean; taskId?: string } {
  const req = uow.laptopRequests.getById(requestId);
  if (!req || req.equipmentPath !== "New Laptop Temporary Spare") {
    return { created: false };
  }
  if (req.replacementTaskId && uow.tasks.getById(req.replacementTaskId)) {
    return { created: false, taskId: req.replacementTaskId };
  }
  const employee = uow.employees.getById(req.employeeId);
  if (!employee) return { created: false };

  const assignedAt = nowIso();
  const taskId =
    employee.id === ALICIA_EMPLOYEE_ID
      ? ALICIA_LAPTOP_REPLACEMENT_TASK_ID
      : uid("tsk-laptop-replace");

  if (uow.tasks.getById(taskId)) {
    uow.laptopRequests.update({
      ...req,
      replacementTaskId: taskId,
      onsiteItStage: "Replacement Pending",
      spareLaptopStatus: "Laptop Replacement Scheduled",
      updatedAt: nowIso(),
    });
    return { created: false, taskId };
  }

  const reminder = initReminderFieldsFromTemplate(
    {
      reminderEnabled: true,
      firstReminderAfterWorkingDays: 1,
      reminderFrequencyWorkingDays: 1,
      maximumReminderCount: 2,
      escalationAfterWorkingDays: 2,
      escalationEmailRule: "Admin",
      fixedEscalationEmail: "",
    },
    assignedAt,
    false
  );

  const task: ChecklistTask = {
    id: taskId,
    employeeId: employee.id,
    onboardingCaseId: req.onboardingCaseId,
    processType: "Onboarding",
    offboardingCaseId: null,
    lifecycleCaseId: req.onboardingCaseId,
    group: "IT Checklist",
    title: `Replace Spare Laptop – ${employee.fullName}`,
    description:
      "New laptop has arrived. Replace the temporary spare and return the spare to inventory.",
    instructions:
      "Swap devices, reassign asset tags, return spare to available inventory, confirm employee readiness.",
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
    dueDate: assignedAt.slice(0, 10),
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
    sortOrder: 39,
    templateTaskId: null,
    taskType: "Action",
    outcome: "None",
    sourceType: "Workflow",
    sourceRecordId: req.id,
    linkedLaptopRequestId: req.id,
    isLaptopPrepareTask: true,
    ...reminder,
  };
  uow.tasks.createMany([task]);

  uow.laptopRequests.update({
    ...req,
    replacementTaskId: taskId,
    onsiteItStage: "Replacement Pending",
    spareLaptopStatus: "Laptop Replacement Scheduled",
    updatedAt: nowIso(),
  });

  uow.mockEmails.createMany([
    {
      id: uid("mail-laptop-replace"),
      automationRunId: "",
      from: "admin@ppg-demo.com",
      to: ONSITE_IT_SUPPORT_EMAIL,
      cc: [],
      subject: `New Laptop Delivered — Replace Spare for ${employee.fullName}`,
      htmlBody: `<p>The new laptop for <strong>${employee.fullName}</strong> has been delivered.</p>
        <p>Please replace the temporary spare and return the spare to inventory.</p>
        <p><a href="/oneflow/tasks/${taskId}">Open Replacement Task</a></p>`,
      sentAt: nowIso(),
      readAt: null,
      status: "Unread",
      employeeId: employee.id,
      onboardingCaseId: req.onboardingCaseId,
      responsibleTeam: "Onsite IT Support",
      notificationType: "New Laptop Delivered",
      relatedTaskId: taskId,
      sourceType: "Laptop Procurement",
      sourceRecordId: req.id,
    },
  ]);

  return { created: true, taskId };
}
