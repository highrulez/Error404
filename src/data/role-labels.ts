import type { UserRole } from "./auth-types";

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Admin",
  HR: "HR",
  IT_SECURITY: "IT Security",
  ONSITE_IT: "Onsite IT",
  FACILITIES: "Facilities",
  HIRING_MANAGER: "Hiring Manager",
  FINANCE: "Finance",
  CORPORATE_CARD: "Corporate Card",
  ADMINISTRATION: "Administration",
  ONBOARDING_EMPLOYEE: "Onboarding Employee",
  OFFBOARDING_EMPLOYEE: "Offboarding Employee",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
