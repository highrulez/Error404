import type { UserRole } from "./auth-types";
import { DANIEL_EMAIL } from "./exit-clearance-types";

export interface DemoUserProfile {
  userId: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
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
    name: "Amanda Lee",
    email: "hr@ppg-demo.com",
    initials: "AL",
    role: "HR",
  },
  {
    userId: "user-security",
    name: "Kelvin Ong",
    email: "itsecurity@ppg-demo.com",
    initials: "KO",
    role: "IT_SECURITY",
  },
  {
    userId: "user-onsite",
    name: "Jason Lim",
    email: "itsupport@ppg-demo.com",
    initials: "JL",
    role: "ONSITE_IT",
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
    name: "Farah Ahmad",
    email: "finance@ppg-demo.com",
    initials: "FA",
    role: "FINANCE",
  },
  {
    userId: "user-corporate-card",
    name: "Michael Wong",
    email: "corporatecard@ppg-demo.com",
    initials: "MW",
    role: "CORPORATE_CARD",
  },
  {
    userId: "user-administration",
    name: "Priya Nair",
    email: "administration@ppg-demo.com",
    initials: "PN",
    role: "ADMINISTRATION",
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
    userId: "user-alicia",
    name: "Alicia Wong",
    email: "alicia.wong@ppg-demo.com",
    initials: "AW",
    role: "ONBOARDING_EMPLOYEE",
  },
  {
    userId: "user-daniel",
    name: "Daniel Lim",
    email: DANIEL_EMAIL,
    initials: "DL",
    role: "OFFBOARDING_EMPLOYEE",
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
