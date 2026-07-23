"use client";

import { useState } from "react";
import type {
  Employee,
  EmployeeType,
  EmploymentStatus,
  TerminationType,
} from "@/data";
import { TERMINATION_TYPES } from "@/data";
import {
  DEPARTMENTS,
  EMPLOYEE_TYPES,
  EMPLOYMENT_STATUSES,
  LOCATIONS,
} from "@/lib/utils";

export type EmployeeFormValues = {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  location: string;
  managerName: string;
  managerEmail: string;
  employeeType: EmployeeType;
  employmentStatus: EmploymentStatus;
  startDate: string;
  lastWorkingDate: string;
  terminationType: TerminationType;
  terminationReason: string;
  immediateAccessRemovalRequired: boolean;
};

export function emptyEmployeeForm(): EmployeeFormValues {
  return {
    fullName: "",
    preferredName: "",
    email: "",
    phone: "",
    department: "Finance",
    role: "",
    location: "Kuala Lumpur HQ",
    managerName: "",
    managerEmail: "",
    employeeType: "Permanent",
    employmentStatus: "Pre-Hire",
    startDate: new Date().toISOString().slice(0, 10),
    lastWorkingDate: "",
    terminationType: "Resignation",
    terminationReason: "",
    immediateAccessRemovalRequired: false,
  };
}

export function employeeToForm(e: Employee): EmployeeFormValues {
  return {
    fullName: e.fullName,
    preferredName: e.preferredName,
    email: e.email,
    phone: e.phone,
    department: e.department,
    role: e.role,
    location: e.location,
    managerName: e.managerName,
    managerEmail: e.managerEmail,
    employeeType: e.employeeType,
    employmentStatus: e.employmentStatus,
    startDate: e.startDate,
    lastWorkingDate: e.lastWorkingDate ?? "",
    terminationType: e.terminationType ?? "Resignation",
    terminationReason: e.terminationReason ?? "",
    immediateAccessRemovalRequired: e.immediateAccessRemovalRequired ?? false,
  };
}

const field =
  "mt-1 w-full rounded-md border border-hris-line bg-white px-3 py-2 text-sm outline-none focus:border-hris-accent";

export function EmployeeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: EmployeeFormValues;
  submitLabel: string;
  onSubmit: (values: EmployeeFormValues) => void;
}) {
  const [values, setValues] = useState<EmployeeFormValues>(
    initial ?? emptyEmployeeForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof EmployeeFormValues>(
    key: K,
    value: EmployeeFormValues[K]
  ) => setValues((v) => ({ ...v, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!values.fullName.trim()) e.fullName = "Required";
    if (!values.email.trim() || !values.email.includes("@"))
      e.email = "Valid email required";
    if (!values.role.trim()) e.role = "Required";
    if (!values.managerName.trim()) e.managerName = "Required";
    if (!values.managerEmail.trim() || !values.managerEmail.includes("@"))
      e.managerEmail = "Valid manager email required";
    if (!values.startDate) e.startDate = "Required";
    if (values.employmentStatus === "Offboarding" && !values.lastWorkingDate) {
      e.lastWorkingDate = "Required for offboarding";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!validate()) return;
        onSubmit(values);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Full name
          <input
            className={field}
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
          {errors.fullName && (
            <span className="text-[11px] text-rose-600">{errors.fullName}</span>
          )}
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Preferred name
          <input
            className={field}
            value={values.preferredName}
            onChange={(e) => set("preferredName", e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Work email
          <input
            className={field}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {errors.email && (
            <span className="text-[11px] text-rose-600">{errors.email}</span>
          )}
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Phone
          <input
            className={field}
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Department
          <select
            className={field}
            value={values.department}
            onChange={(e) => set("department", e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Role
          <input
            className={field}
            value={values.role}
            onChange={(e) => set("role", e.target.value)}
          />
          {errors.role && (
            <span className="text-[11px] text-rose-600">{errors.role}</span>
          )}
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Location
          <select
            className={field}
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Employee type
          <select
            className={field}
            value={values.employeeType}
            onChange={(e) =>
              set("employeeType", e.target.value as EmployeeType)
            }
          >
            {EMPLOYEE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Employment status
          <select
            className={field}
            value={values.employmentStatus}
            onChange={(e) =>
              set("employmentStatus", e.target.value as EmploymentStatus)
            }
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Start date
          <input
            type="date"
            className={field}
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
          {errors.startDate && (
            <span className="text-[11px] text-rose-600">{errors.startDate}</span>
          )}
        </label>
        {values.employmentStatus === "Offboarding" && (
          <>
            <label className="text-xs font-semibold text-slate-600">
              Last working date
              <input
                type="date"
                className={field}
                value={values.lastWorkingDate}
                onChange={(e) => set("lastWorkingDate", e.target.value)}
              />
              {errors.lastWorkingDate && (
                <span className="text-[11px] text-rose-600">
                  {errors.lastWorkingDate}
                </span>
              )}
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Termination type
              <select
                className={field}
                value={values.terminationType}
                onChange={(e) =>
                  set("terminationType", e.target.value as TerminationType)
                }
              >
                {TERMINATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Termination reason
              <input
                className={field}
                value={values.terminationReason}
                onChange={(e) => set("terminationReason", e.target.value)}
                placeholder="Optional notes for HR"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.immediateAccessRemovalRequired}
                onChange={(e) =>
                  set("immediateAccessRemovalRequired", e.target.checked)
                }
              />
              Immediate access removal required
            </label>
          </>
        )}
        <label className="text-xs font-semibold text-slate-600">
          Manager name
          <input
            className={field}
            value={values.managerName}
            onChange={(e) => set("managerName", e.target.value)}
          />
          {errors.managerName && (
            <span className="text-[11px] text-rose-600">{errors.managerName}</span>
          )}
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Manager email
          <input
            className={field}
            value={values.managerEmail}
            onChange={(e) => set("managerEmail", e.target.value)}
          />
          {errors.managerEmail && (
            <span className="text-[11px] text-rose-600">
              {errors.managerEmail}
            </span>
          )}
        </label>
      </div>

      <p className="rounded-md border border-teal-200 bg-hris-soft px-3 py-2 text-xs text-hris-accentDark">
        Setting status to <strong>New Hire</strong> creates one onboarding case
        in OneFlow (duplicate cases are blocked). Setting status to{" "}
        <strong>Offboarding</strong> creates an offboarding case with clearance
        tasks when a last working date is provided.
      </p>

      <button
        type="submit"
        className="rounded-md bg-hris-accent px-4 py-2 text-sm font-semibold text-white hover:bg-hris-accentDark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
