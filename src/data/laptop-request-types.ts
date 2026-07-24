/** Laptop Requirement & Purchase Order workflow types */

export type LaptopRequestStatus =
  | "Awaiting Manager Decision"
  | "Laptop Not Required"
  | "Awaiting Procurement"
  | "Awaiting PO"
  | "PO Created"
  | "Ordered"
  | "Awaiting Delivery"
  | "Delivered"
  | "Ready for Configuration"
  | "Completed"
  | "Cancelled";

/** Parallel equipment fulfillment path (independent of IT Security handoff). */
export type EquipmentFulfillmentPath =
  | "Decision Pending"
  | "New Laptop Temporary Spare"
  | "Reuse Existing Laptop"
  | "Not Required";

export type ItSecurityProvisioningStage =
  | "Pending"
  | "In Progress"
  | "Provisioning Complete";

export type LaptopDecisionStage =
  | "Pending Manager Decision"
  | "New Laptop Approved"
  | "Reuse Existing Laptop"
  | "Not Required";

export type ProcurementStage =
  | "Not Required"
  | "Pending"
  | "PO Creation"
  | "Ordered"
  | "Delivered";

export type OnsiteItEquipmentStage =
  | "Awaiting Security Handoff"
  | "Preparation Ready"
  | "Preparing Spare Laptop"
  | "Preparing Existing Laptop"
  | "Ready for Employee"
  | "Replacement Pending"
  | "Completed";

export type SpareLaptopStatus =
  | "Spare Laptop Preparation"
  | "Spare Laptop Assigned"
  | "New Laptop Purchase In Progress"
  | "New Laptop Received"
  | "Laptop Replacement Scheduled"
  | "New Laptop Assigned"
  | "Spare Laptop Returned"
  | "";

export type ExistingLaptopPrepStatus =
  | "Existing Laptop Selected"
  | "Reimage In Progress"
  | "Software Installation"
  | "Ready for Assignment"
  | "Existing Laptop Assigned"
  | "";

export type LaptopRequirementType =
  | "Standard Laptop"
  | "High Performance Laptop"
  | "Developer Laptop"
  | "Existing Laptop Reassignment"
  | "Special Requirement"
  | "";

export type LaptopNotRequiredReason =
  | "Existing laptop will be reassigned"
  | "Employee does not require a laptop"
  | "Employee uses shared workstation"
  | "Contractor provides own equipment"
  | "Other"
  | "";

export type EmployeeSafeEquipmentStatus =
  | "Awaiting manager decision"
  | "Laptop not required"
  | "Equipment is being prepared for your first day"
  | "Temporary laptop prepared"
  | "New laptop assigned"
  | "Laptop request submitted"
  | "Laptop ordered"
  | "Equipment preparation in progress"
  | "Ready for Day One";

export interface LaptopRequest {
  id: string;
  onboardingCaseId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  managerName: string;
  managerEmail: string;
  requestStatus: LaptopRequestStatus;
  laptopRequired: boolean | null;
  managerDecision: "Yes" | "No" | null;
  managerDecisionReason: LaptopNotRequiredReason | string;
  departmentCreditNumber: string;
  costCentre: string;
  laptopRequirementType: LaptopRequirementType;
  requestedSpecification: string;
  standardModelRequested: string;
  specialSpecificationRequired: boolean;
  businessJustification: string;
  requiredDeliveryDate: string | null;
  managerRemarks: string;
  managerSubmittedAt: string | null;
  managerSubmittedBy: string | null;
  procurementAssignedEmail: string;
  vendorName: string;
  quotationReference: string;
  purchaseOrderNumber: string;
  purchaseOrderDate: string | null;
  estimatedDeliveryDate: string | null;
  procurementRemarks: string;
  procurementCompletedAt: string | null;
  procurementCompletedBy: string | null;
  onsiteITTaskId: string | null;
  managerTaskId: string | null;
  procurementTaskId: string | null;
  replacementTaskId?: string | null;
  onsiteStatus:
    | "Pending"
    | "Awaiting Delivery"
    | "Device Received"
    | "Configuration In Progress"
    | "Ready for Collection"
    | "Completed"
    | null;
  /** Parallel stage model (IT Security handoff is never blocked by procurement). */
  equipmentPath?: EquipmentFulfillmentPath | null;
  itSecurityStage?: ItSecurityProvisioningStage | null;
  laptopDecisionStage?: LaptopDecisionStage | null;
  procurementStage?: ProcurementStage | null;
  onsiteItStage?: OnsiteItEquipmentStage | null;
  spareLaptopStatus?: SpareLaptopStatus | null;
  existingLaptopStatus?: ExistingLaptopPrepStatus | null;
  spareAssetNumber?: string;
  existingAssetNumber?: string;
  previousAssignment?: string;
  deviceCondition?: string;
  softwareRequirements?: string;
  specialEquipmentNotes?: string;
  networkIdSnapshot?: string;
  companyEmailSnapshot?: string;
  sailpointProvisioningStatus?: string;
  securityHandoffAt?: string | null;
  securityHandoffEmailId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ALICIA_LAPTOP_REQUEST_ID = "laptop-request-alicia-0921";
export const ALICIA_LAPTOP_MANAGER_TASK_ID = "task-laptop-decision-alicia-0921";
export const ALICIA_LAPTOP_PO_TASK_ID = "tsk-alicia-laptop-po";
export const ALICIA_LAPTOP_PREPARE_TASK_ID = "tsk-alicia-laptop-prepare";
export const ALICIA_LAPTOP_REPLACEMENT_TASK_ID = "tsk-alicia-laptop-replace";
export const ALICIA_LAPTOP_MANAGER_EMAIL_ID = "mail-laptop-decision-alicia-0921";
export const ALICIA_SAILPOINT_HANDOFF_EMAIL_ID = "mail-sailpoint-handoff-alicia-0921";

export const ALICIA_LAPTOP_LEGACY_IDS = {
  request: ["laptop-req-alicia-wong", "laptop-request-alicia-wong"],
  managerTask: ["tsk-alicia-laptop-decision", "task-laptop-decision-alicia"],
  managerEmail: ["mail-alicia-laptop-decision"],
} as const;

export function resolveAliciaLaptopRequestId(id: string | null | undefined): string {
  if (!id) return ALICIA_LAPTOP_REQUEST_ID;
  if (id === ALICIA_LAPTOP_REQUEST_ID) return id;
  if ((ALICIA_LAPTOP_LEGACY_IDS.request as readonly string[]).includes(id)) {
    return ALICIA_LAPTOP_REQUEST_ID;
  }
  return id;
}

export function resolveAliciaLaptopManagerTaskId(
  id: string | null | undefined
): string {
  if (!id) return ALICIA_LAPTOP_MANAGER_TASK_ID;
  if (id === ALICIA_LAPTOP_MANAGER_TASK_ID) return id;
  if ((ALICIA_LAPTOP_LEGACY_IDS.managerTask as readonly string[]).includes(id)) {
    return ALICIA_LAPTOP_MANAGER_TASK_ID;
  }
  return id;
}

export const LAPTOP_DEMO = {
  departmentCreditNumber: "CC-MY-CS-2048",
  costCentre: "MY-CUST-4100",
  laptopRequirementType: "Standard Laptop" as LaptopRequirementType,
  businessJustification:
    "Laptop required for customer service systems, Microsoft 365, CRM access and daily operational work.",
  vendorName: "Demo Technology Sdn Bhd",
  quotationReference: "QT-2026-0921",
  purchaseOrderNumber: "PO-MY-2026-0921",
};

export function deriveEquipmentPath(
  req: Pick<LaptopRequest, "managerDecision" | "laptopRequired" | "requestStatus">
): EquipmentFulfillmentPath {
  if (req.requestStatus === "Laptop Not Required" || req.laptopRequired === false) {
    if (
      req.managerDecision === "No" ||
      req.requestStatus === "Laptop Not Required"
    ) {
      // "No" with reuse reason → reuse path; pure not-required stays Not Required
      return "Reuse Existing Laptop";
    }
  }
  if (req.managerDecision === "Yes") return "New Laptop Temporary Spare";
  if (req.managerDecision === "No") return "Reuse Existing Laptop";
  return "Decision Pending";
}

export function deriveLaptopDecisionStage(
  req: Pick<LaptopRequest, "managerDecision" | "laptopRequired" | "requestStatus">
): LaptopDecisionStage {
  if (req.managerDecision === "Yes") return "New Laptop Approved";
  if (req.managerDecision === "No") {
    if (req.laptopRequired === false && req.requestStatus === "Laptop Not Required") {
      return "Not Required";
    }
    return "Reuse Existing Laptop";
  }
  return "Pending Manager Decision";
}

export function deriveProcurementStage(
  req: Pick<LaptopRequest, "managerDecision" | "requestStatus" | "laptopRequired">
): ProcurementStage {
  if (req.managerDecision !== "Yes") return "Not Required";
  switch (req.requestStatus) {
    case "Awaiting PO":
    case "Awaiting Procurement":
      return "PO Creation";
    case "PO Created":
    case "Ordered":
    case "Awaiting Delivery":
      return "Ordered";
    case "Delivered":
    case "Ready for Configuration":
    case "Completed":
      return "Delivered";
    default:
      return "Pending";
  }
}

export function employeeSafeEquipmentStatus(
  req: LaptopRequest | undefined | null
): EmployeeSafeEquipmentStatus {
  if (!req) return "Awaiting manager decision";

  if (req.spareLaptopStatus === "New Laptop Assigned") {
    return "New laptop assigned";
  }
  if (
    req.spareLaptopStatus === "Spare Laptop Assigned" ||
    req.existingLaptopStatus === "Existing Laptop Assigned"
  ) {
    return "Temporary laptop prepared";
  }
  if (
    req.onsiteItStage === "Preparing Spare Laptop" ||
    req.onsiteItStage === "Preparing Existing Laptop" ||
    req.onsiteItStage === "Preparation Ready" ||
    req.onsiteStatus === "Configuration In Progress" ||
    req.onsiteStatus === "Device Received" ||
    req.onsiteStatus === "Awaiting Delivery"
  ) {
    return "Equipment is being prepared for your first day";
  }

  switch (req.requestStatus) {
    case "Laptop Not Required":
      return "Laptop not required";
    case "Awaiting Manager Decision":
      if (req.itSecurityStage === "Provisioning Complete") {
        return "Equipment is being prepared for your first day";
      }
      return "Awaiting manager decision";
    case "Awaiting Procurement":
    case "Awaiting PO":
      return "Equipment is being prepared for your first day";
    case "PO Created":
    case "Ordered":
      return "Equipment is being prepared for your first day";
    case "Awaiting Delivery":
    case "Delivered":
    case "Ready for Configuration":
      return "Equipment preparation in progress";
    case "Completed":
      return "Ready for Day One";
    case "Cancelled":
      return "Laptop not required";
    default:
      return "Awaiting manager decision";
  }
}
