import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DEPARTMENTS = [
  "Finance",
  "Information Technology",
  "Human Resources",
  "Operations",
  "Marketing",
  "Sales",
  "Facilities",
  "Research & Development",
  "Legal",
] as const;

export const LOCATIONS = [
  "Kuala Lumpur HQ",
  "Petaling Jaya Campus",
  "Penang Plant",
  "Johor Bahru Hub",
  "Shah Alam R&D",
  "Remote - Malaysia",
] as const;

export const EMPLOYMENT_STATUSES = [
  "Pre-Hire",
  "New Hire",
  "Active",
  "Offboarding",
  "Terminated",
] as const;

export const EMPLOYEE_TYPES = ["Permanent", "Contract", "Intern"] as const;

export const TASK_STATUSES = [
  "Pending",
  "In Progress",
  "Completed",
  "Overdue",
  "Blocked",
] as const;
