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
  | "Laptop request submitted"
  | "Purchase in progress"
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
  onsiteStatus:
    | "Pending"
    | "Awaiting Delivery"
    | "Device Received"
    | "Configuration In Progress"
    | "Ready for Collection"
    | "Completed"
    | null;
  createdAt: string;
  updatedAt: string;
}

export const ALICIA_LAPTOP_REQUEST_ID = "laptop-request-alicia-0921";
export const ALICIA_LAPTOP_MANAGER_TASK_ID = "task-laptop-decision-alicia-0921";
export const ALICIA_LAPTOP_PO_TASK_ID = "tsk-alicia-laptop-po";
export const ALICIA_LAPTOP_PREPARE_TASK_ID = "tsk-alicia-laptop-prepare";
export const ALICIA_LAPTOP_MANAGER_EMAIL_ID = "mail-laptop-decision-alicia-0921";

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

export function employeeSafeEquipmentStatus(
  req: LaptopRequest | undefined | null
): EmployeeSafeEquipmentStatus {
  if (!req) return "Awaiting manager decision";
  switch (req.requestStatus) {
    case "Laptop Not Required":
      return "Laptop not required";
    case "Awaiting Manager Decision":
      return "Awaiting manager decision";
    case "Awaiting Procurement":
    case "Awaiting PO":
      return req.managerDecision === "Yes"
        ? "Laptop request submitted"
        : "Purchase in progress";
    case "PO Created":
    case "Ordered":
      return "Laptop ordered";
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
