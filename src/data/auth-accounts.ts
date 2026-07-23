import type { User, UserRole } from "./auth-types";
import type { ResponsibleTeam } from "./types";
import { DEMO_PROFILES } from "./demo-profiles";
import { migrateEmailAddress } from "./email-domain";

const ROLE_TO_TEAM_LOOKUP: Partial<Record<UserRole, ResponsibleTeam>> = {
  HR: "HR Operations",
  IT_SECURITY: "IT Security",
  ONSITE_IT: "Onsite IT Support",
  FACILITIES: "Facilities / Building Management",
  HIRING_MANAGER: "Hiring Manager",
  FINANCE: "Finance / Administration",
  CORPORATE_CARD: "Corporate Card Admin",
  ADMINISTRATION: "Administration",
  QUALITY: "Quality",
  PRODUCT_STEWARDSHIP: "Product Stewardship",
};

export const ROLE_TO_TEAM = ROLE_TO_TEAM_LOOKUP;

/** Prototype accounts only — not Microsoft Entra ID. */
export const DEMO_USERS: User[] = DEMO_PROFILES.map((p) => ({
  id: p.userId,
  name: p.name,
  email: p.email,
  password: "Demo123!",
  role: p.role,
  initials: p.initials,
  responsibleTeam:
    p.role === "Admin" ||
    p.role === "OFFBOARDING_EMPLOYEE" ||
    p.role === "ONBOARDING_EMPLOYEE"
      ? undefined
      : (ROLE_TO_TEAM_LOOKUP[p.role] as ResponsibleTeam | undefined),
}));

/** Maps responsible team → inbox recipient (login email). */
export const TEAM_INBOX_EMAIL: Record<ResponsibleTeam, string> = {
  "HR Operations": "hr@ppg-demo.com",
  "IT Security": "itsecurity@ppg-demo.com",
  "Onsite IT Support": "itsupport@ppg-demo.com",
  "Facilities / Building Management": "facilities@ppg-demo.com",
  "Hiring Manager": "manager@ppg-demo.com",
  "Finance / Administration": "finance@ppg-demo.com",
  "Corporate Card Admin": "corporatecard@ppg-demo.com",
  Administration: "administration@ppg-demo.com",
  Quality: "quality@ppg-demo.com",
  "Product Stewardship": "productstewardship@ppg-demo.com",
};

/** Task routing assigned emails — same as login mailboxes (@ppg-demo.com). */
export const TEAM_ASSIGNED_EMAIL: Record<ResponsibleTeam, string> = {
  ...TEAM_INBOX_EMAIL,
};

export const SESSION_STORAGE_KEY = "oneflow-phase1-session-v1";

export function findDemoUser(email: string, password: string): User | undefined {
  const normalized = migrateEmailAddress(email.trim()).toLowerCase();
  return DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalized && u.password === password
  );
}

export function findDemoUserByEmail(email: string): User | undefined {
  const normalized = migrateEmailAddress(email.trim()).toLowerCase();
  return DEMO_USERS.find((u) => u.email.toLowerCase() === normalized);
}
