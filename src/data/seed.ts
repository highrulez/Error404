import type { AppStore, Employee } from "./types";
import { DEFAULT_ASSIGNMENT_RULES } from "./checklist";
import { createDefaultChecklistTemplates } from "./checklist-templates-seed";
import { createDefaultOffboardingTemplates } from "./offboarding-templates-seed";
import { createDefaultExitClearanceTemplates } from "./exit-clearance-templates-seed";
import { buildDanielDemoPackage } from "./daniel-seed";
import { buildAliciaDemoPackage } from "./alicia-seed";
import { DANIEL_EMPLOYEE_ID } from "./exit-clearance-types";
import { ALICIA_EMPLOYEE_ID } from "./alicia-types";
import { HIRING_MANAGER_PROFILE } from "./demo-profiles";

const now = "2026-07-20T09:00:00.000Z";

/** Sample employees (Hamdan + Nabila injected via lifecycle demo packages). */
export const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    employeeNumber: "MY-10401",
    fullName: "Thamotharan, Renuka Malar",
    preferredName: "Renuka Malar",
    email: "renuka.malar.thamotharan@ppg-demo.com",
    phone: "+60 12-555 0101",
    department: "GCSS - RPA • GCSS, Delivery Management",
    role: "Application Developer Specialist",
    location: "Malaysia – UOA Business Park",
    managerName: HIRING_MANAGER_PROFILE.name,
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Active",
    startDate: "2021-11-08",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-002",
    employeeNumber: "MY-10422",
    fullName: "Nagaraja, Umashangari",
    preferredName: "Umashangari",
    email: "umashangari.nagaraja@ppg-demo.com",
    phone: "+60 12-555 0103",
    department: "GCSS, Delivery Management",
    role: "Business Analysis Specialist II",
    location: "Malaysia – UOA Business Park",
    managerName: HIRING_MANAGER_PROFILE.name,
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Active",
    startDate: "2023-02-20",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-003",
    employeeNumber: "MY-10458",
    fullName: "Ramachandran, Yuganeswary",
    preferredName: "Yuganeswary",
    email: "yuganeswary.ramachandran@ppg-demo.com",
    phone: "+60 12-555 0104",
    department: "Req Bus Sup MY Fin MDM",
    role: "Data Management Steward I",
    location: "Malaysia – UOA Business Park",
    managerName: HIRING_MANAGER_PROFILE.name,
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Active",
    startDate: "2024-01-15",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
];

export function createSeedStore(): AppStore {
  const checklistTemplates = [
    ...createDefaultChecklistTemplates(),
    ...createDefaultOffboardingTemplates(),
  ];
  const assignmentRules = DEFAULT_ASSIGNMENT_RULES;
  const exitClearanceTemplates = createDefaultExitClearanceTemplates();
  const daniel = buildDanielDemoPackage({
    checklistTemplates,
    assignmentRules,
    exitClearanceTemplates,
  });
  const alicia = buildAliciaDemoPackage({
    checklistTemplates,
    assignmentRules,
  });

  const employees = [
    alicia.employee,
    daniel.employee,
    ...SAMPLE_EMPLOYEES.filter(
      (e) => e.id !== DANIEL_EMPLOYEE_ID && e.id !== ALICIA_EMPLOYEE_ID
    ),
  ];

  return {
    version: 8,
    employees,
    onboardingCases: [alicia.onboardingCase],
    offboardingCases: [daniel.offboardingCase],
    tasks: [...alicia.tasks, ...daniel.tasks],
    activity: [...alicia.activity, ...daniel.activity],
    assignmentRules,
    checklistTemplates,
    checklistTemplateAudits: [],
    mockEmails: [...alicia.emails, ...daniel.emails],
    automationRuns: [
      ...alicia.automationRuns,
      ...daniel.automationRuns,
    ],
    exitClearanceForms: [daniel.exitForm],
    exitClearanceTemplates: daniel.exitClearanceTemplates,
    inductionForms: [alicia.inductionForm],
    accessCardForms: [alicia.accessCardForm],
    laptopRequests: alicia.laptopRequests,
    settings: { automationMode: "simulation" },
  };
}
