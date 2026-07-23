import type { ExitClearanceTemplateItem } from "./exit-clearance-types";

function nowIso(): string {
  return new Date().toISOString();
}

export const EXIT_TMPL_IDS = {
  undertakings: "exit-tmpl-01-undertakings",
  expenseReport: "exit-tmpl-02-expense",
  proprietary: "exit-tmpl-03-proprietary",
  approvalAuthority: "exit-tmpl-04-approval",
  cashAdvances: "exit-tmpl-05-cash",
  corporateCard: "exit-tmpl-06-card",
  mobilePhone: "exit-tmpl-07-mobile",
  simCard: "exit-tmpl-08-sim",
  keys: "exit-tmpl-09-keys",
  accessCard: "exit-tmpl-10-access",
} as const;

export function createDefaultExitClearanceTemplates(): ExitClearanceTemplateItem[] {
  const ts = nowIso();
  const base = (
    partial: Omit<
      ExitClearanceTemplateItem,
      "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "active"
    > & { active?: boolean }
  ): ExitClearanceTemplateItem => ({
    active: true,
    createdAt: ts,
    updatedAt: ts,
    createdBy: "System",
    updatedBy: "System",
    ...partial,
  });

  return [
    base({
      id: EXIT_TMPL_IDS.undertakings,
      sequenceNumber: 1,
      title: "Undertakings",
      description:
        "Company-sponsored training fee, sign-on bonus, or other employee undertakings.",
      confirmationDepartment: "Human Resources",
      confirmationRole: "HR Operations",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "hr@ppg-demo.com",
      conditionalFields: [],
      alwaysRequiresConfirmation: true,
      sortOrder: 10,
    }),
    base({
      id: EXIT_TMPL_IDS.expenseReport,
      sequenceNumber: 2,
      title: "Outstanding Expense Report",
      description: "Outstanding expense reports requiring manager confirmation.",
      confirmationDepartment: "Direct Line Manager",
      confirmationRole: "Hiring Manager",
      assignmentEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
      conditionalFields: [],
      alwaysRequiresConfirmation: true,
      sortOrder: 20,
    }),
    base({
      id: EXIT_TMPL_IDS.proprietary,
      sequenceNumber: 3,
      title: "Proprietary Information",
      description:
        "All documents containing information belonging to the company have been returned, transferred, or appropriately handled.",
      confirmationDepartment: "Direct Line Manager",
      confirmationRole: "Hiring Manager",
      assignmentEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
      conditionalFields: [],
      alwaysRequiresConfirmation: true,
      sortOrder: 30,
    }),
    base({
      id: EXIT_TMPL_IDS.approvalAuthority,
      sequenceNumber: 4,
      title: "Remove Employee from Approval Authority Listing",
      description:
        "Applicable approval-authority listings must be removed or reassigned.",
      confirmationDepartment: "Direct Line Manager",
      confirmationRole: "Hiring Manager",
      assignmentEmailRule: "Employee Manager Email",
      fixedAssignedEmail: "",
      conditionalFields: [],
      alwaysRequiresConfirmation: true,
      sortOrder: 40,
    }),
    base({
      id: EXIT_TMPL_IDS.cashAdvances,
      sequenceNumber: 5,
      title: "Cash Advances / Loans",
      description:
        "Relocation expenses, travel expenses, employee advances, or loans.",
      confirmationDepartment: "Finance / Concur Team",
      confirmationRole: "Finance / Administration",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "finance@ppg-demo.com",
      conditionalFields: [],
      alwaysRequiresConfirmation: false,
      sortOrder: 50,
    }),
    base({
      id: EXIT_TMPL_IDS.corporateCard,
      sequenceNumber: 6,
      title: "Corporate Credit Card",
      description: "Corporate credit card return or cancellation.",
      confirmationDepartment: "APAC Corporate Card Admin",
      confirmationRole: "Corporate Card Admin",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "corporatecard@ppg-demo.com",
      conditionalFields: [],
      alwaysRequiresConfirmation: false,
      sortOrder: 60,
    }),
    base({
      id: EXIT_TMPL_IDS.mobilePhone,
      sequenceNumber: 7,
      title: "Mobile Phone",
      description: "Please indicate the company mobile-phone model.",
      confirmationDepartment: "Administration",
      confirmationRole: "Administration",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "administration@ppg-demo.com",
      conditionalFields: [
        { key: "mobilePhoneModel", label: "Mobile phone model", type: "text", required: true },
        { key: "assetTag", label: "Asset tag", type: "text", required: true },
        { key: "serialNumber", label: "Serial number", type: "text", required: false },
        {
          key: "condition",
          label: "Condition",
          type: "select",
          required: true,
          options: ["Good", "Fair", "Damaged"],
        },
        { key: "remarks", label: "Remarks", type: "textarea", required: false },
      ],
      alwaysRequiresConfirmation: false,
      sortOrder: 70,
    }),
    base({
      id: EXIT_TMPL_IDS.simCard,
      sequenceNumber: 8,
      title: "SIM Card for Mobile Phone",
      description: "Please indicate the company mobile number.",
      confirmationDepartment: "Administration",
      confirmationRole: "Administration",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "administration@ppg-demo.com",
      conditionalFields: [
        { key: "mobileNumber", label: "Mobile number", type: "text", required: true },
        { key: "simSerialNumber", label: "SIM serial number", type: "text", required: false },
        {
          key: "condition",
          label: "Condition",
          type: "select",
          required: true,
          options: ["Good", "Fair", "Damaged"],
        },
        { key: "remarks", label: "Remarks", type: "textarea", required: false },
      ],
      alwaysRequiresConfirmation: false,
      sortOrder: 80,
    }),
    base({
      id: EXIT_TMPL_IDS.keys,
      sequenceNumber: 9,
      title: "Keys",
      description: "Confirm all company keys held by the employee.",
      confirmationDepartment: "Administration",
      confirmationRole: "Administration",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "administration@ppg-demo.com",
      conditionalFields: [
        { key: "doorKeys", label: "Total number of door keys", type: "number", required: true },
        { key: "cabinetKeys", label: "Total number of cabinet keys", type: "number", required: true },
        { key: "toiletKeys", label: "Total number of toilet keys", type: "number", required: true },
        { key: "officeKeys", label: "Total number of office keys", type: "number", required: true },
        { key: "otherKeys", label: "Other keys", type: "text", required: false },
        { key: "remarks", label: "Remarks", type: "textarea", required: false },
      ],
      alwaysRequiresConfirmation: false,
      sortOrder: 90,
    }),
    base({
      id: EXIT_TMPL_IDS.accessCard,
      sequenceNumber: 10,
      title: "Door Access Card",
      description: "Company door access card return or disablement.",
      confirmationDepartment: "Administration",
      confirmationRole: "Administration",
      assignmentEmailRule: "Fixed Email",
      fixedAssignedEmail: "administration@ppg-demo.com",
      conditionalFields: [
        { key: "accessCardNumber", label: "Access card number", type: "text", required: true },
        { key: "returnDate", label: "Return date", type: "date", required: true },
        {
          key: "condition",
          label: "Condition",
          type: "select",
          required: true,
          options: ["Good", "Fair", "Damaged"],
        },
        { key: "remarks", label: "Remarks", type: "textarea", required: false },
      ],
      alwaysRequiresConfirmation: false,
      sortOrder: 100,
    }),
  ];
}
