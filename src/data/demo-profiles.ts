import type { UserRole } from "./auth-types";
import { DANIEL_EMAIL } from "./exit-clearance-types";

export interface DemoUserProfile {
  userId: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  position?: string;
  department?: string;
  location?: string;
  employmentStatus?: string;
}

/** Display names and initials for confirmation / audit attribution. */
export const DEMO_PROFILES: DemoUserProfile[] = [
  {
    userId: "user-admin",
    name: "OneFlow Admin",
    email: "admin@ppg-demo.com",
    initials: "OA",
    role: "Admin",
  },
  {
    userId: "user-hr",
    name: "Soh, Shi Rui Sherry",
    email: "sherry.soh@ppg-demo.com",
    initials: "SSS",
    role: "HR",
    position: "HR Business Services Manager, Singapore & Malaysia Shared Service Center",
    department: "HR Business Services APAC",
  },
  {
    userId: "user-security",
    name: "Mohd Azli, Amirul Mukhlis",
    email: "amirul.azli@ppg-demo.com",
    initials: "MAM",
    role: "IT_SECURITY",
    position: "Information Security Analyst",
    department: "IT Security Compliance",
  },
  {
    userId: "user-onsite",
    name: "Zulfikar Zikri, Nuqman Haziq",
    email: "nuqman.zulfikar@ppg-demo.com",
    initials: "ZZN",
    role: "ONSITE_IT",
    position: "Site IT Support Analyst IV",
    department: "AP Information Technology (MY)",
  },
  {
    userId: "user-facilities",
    name: "Nur Aisyah",
    email: "facilities@ppg-demo.com",
    initials: "NA",
    role: "FACILITIES",
  },
  {
    userId: "user-manager",
    name: "Sarah Tan",
    email: "manager@ppg-demo.com",
    initials: "ST",
    role: "HIRING_MANAGER",
  },
  {
    userId: "user-finance",
    name: "Bashari, Noorliana (MAL)",
    email: "noorliana.bashari@ppg-demo.com",
    initials: "BNM",
    role: "FINANCE",
    position: "Accounts Receivable Officer",
    department: "Req Bus Sup MY Fin AR",
  },
  {
    userId: "user-corporate-card",
    name: "Michael Wong",
    email: "corporatecard@ppg-demo.com",
    initials: "MW",
    role: "CORPORATE_CARD",
  },
  {
    userId: "user-quality",
    name: "Quality Representative",
    email: "quality@ppg-demo.com",
    initials: "QR",
    role: "QUALITY",
  },
  {
    userId: "user-product-stewardship",
    name: "Product Stewardship Representative",
    email: "productstewardship@ppg-demo.com",
    initials: "PS",
    role: "PRODUCT_STEWARDSHIP",
  },
  {
    userId: "user-nabila",
    name: "Aziz, Nabila",
    email: "nabila.aziz@ppg-demo.com",
    initials: "AN",
    role: "ONBOARDING_EMPLOYEE",
    position: "Application Developer Specialist",
    department: "GCSS - RPA • GCSS, Delivery Management",
    location: "Malaysia – UOA Business Park",
    employmentStatus: "Preboarding",
  },
  {
    userId: "user-hamdan",
    name: "Hamdan, Muhamad Asyraf Naqiyuddin",
    email: DANIEL_EMAIL,
    initials: "HMA",
    role: "OFFBOARDING_EMPLOYEE",
    position: "SAP COE EDI Analyst",
    department: "Req Sup IT IT BFS EAD",
    location: "Malaysia – UOA Business Park",
    employmentStatus: "Offboarding",
  },
];

export function profileByEmail(email: string): DemoUserProfile | undefined {
  const n = email.trim().toLowerCase();
  return DEMO_PROFILES.find((p) => p.email.toLowerCase() === n);
}

export function profileByUserId(userId: string): DemoUserProfile | undefined {
  return DEMO_PROFILES.find((p) => p.userId === userId);
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}
