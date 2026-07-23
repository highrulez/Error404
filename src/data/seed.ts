import type { AppStore, Employee } from "./types";
import { DEFAULT_ASSIGNMENT_RULES } from "./checklist";
import { createDefaultChecklistTemplates } from "./checklist-templates-seed";
import { createDefaultOffboardingTemplates } from "./offboarding-templates-seed";
import { createDefaultExitClearanceTemplates } from "./exit-clearance-templates-seed";
import { buildDanielDemoPackage } from "./daniel-seed";
import { buildAliciaDemoPackage } from "./alicia-seed";
import { DANIEL_EMPLOYEE_ID } from "./exit-clearance-types";
import { ALICIA_EMPLOYEE_ID } from "./alicia-types";

const now = "2026-07-20T09:00:00.000Z";

/** Sample employees (Daniel + Alicia injected via demo packages). */
export const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    employeeNumber: "MY-10401",
    fullName: "Nur Aisyah binti Hassan",
    preferredName: "Aisyah",
    email: "aisyah.hassan@ppg-demo.my",
    phone: "+60 12-334 8891",
    department: "Finance",
    role: "Financial Analyst",
    location: "Kuala Lumpur HQ",
    managerName: "Hiring Manager",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Active",
    startDate: "2024-03-11",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-002",
    employeeNumber: "MY-10422",
    fullName: "Rajesh a/l Subramaniam",
    preferredName: "Rajesh",
    email: "rajesh.subra@ppg-demo.my",
    phone: "+60 16-778 2203",
    department: "Information Technology",
    role: "Systems Engineer",
    location: "Petaling Jaya Campus",
    managerName: "Hiring Manager",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Active",
    startDate: "2023-09-04",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-003",
    employeeNumber: "MY-10458",
    fullName: "Amirul Hakim bin Ismail",
    preferredName: "Amirul",
    email: "amirul.hakim@ppg-demo.my",
    phone: "+60 19-445 6612",
    department: "Operations",
    role: "Plant Supervisor",
    location: "Penang Plant",
    managerName: "Hiring Manager",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Permanent",
    employmentStatus: "Pre-Hire",
    startDate: "2026-08-18",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-004",
    employeeNumber: "MY-10471",
    fullName: "Chong Mei Xin",
    preferredName: "Mei Xin",
    email: "meixin.chong@ppg-demo.my",
    phone: "+60 11-2334 9055",
    department: "Marketing",
    role: "Brand Specialist",
    location: "Johor Bahru Hub",
    managerName: "Hiring Manager",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Contract",
    employmentStatus: "Active",
    startDate: "2025-01-20",
    requiresOnboarding: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "emp-005",
    employeeNumber: "MY-10490",
    fullName: "Priya Lakshmi a/p Ganesan",
    preferredName: "Priya",
    email: "priya.ganesan@ppg-demo.my",
    phone: "+60 13-902 4418",
    department: "Human Resources",
    role: "HR Business Partner",
    location: "Shah Alam R&D",
    managerName: "Hiring Manager",
    managerEmail: "manager@ppg-demo.com",
    employeeType: "Intern",
    employmentStatus: "Active",
    startDate: "2025-11-03",
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
    version: 6,
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
