"use client";

import { use } from "react";
import Link from "next/link";
import { WorkdayShell } from "@/components/workday/shell";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store, updateEmployee } = useData();
  const employee = store.employees.find((e) => e.id === id);
  const onb = store.onboardingCases.find((c) => c.employeeId === id);

  if (!employee) {
    return (
      <WorkdayShell title="Worker not found">
        <p className="text-sm text-slate-500">
          No worker with this id.{" "}
          <Link href="/workday" className="text-hris-accentDark underline">
            Back to list
          </Link>
        </p>
      </WorkdayShell>
    );
  }

  const fields = [
    ["Employee number", employee.employeeNumber],
    ["Email", employee.email],
    ["Phone", employee.phone],
    ["Department", employee.department],
    ["Role", employee.role],
    ["Location", employee.location],
    ["Employee type", employee.employeeType],
    ["Start date", formatDate(employee.startDate)],
    ["Manager", employee.managerName],
    ["Manager email", employee.managerEmail],
  ] as const;

  return (
    <WorkdayShell
      title={employee.fullName}
      subtitle={`${employee.employeeNumber} · ${employee.preferredName}`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusChip status={employee.employmentStatus} />
        {employee.requiresOnboarding && (
          <StatusChip status="New Hire" />
        )}
        <Link
          href={`/workday/employees/${employee.id}/edit`}
          className="rounded-md border border-hris-line bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
        >
          Edit worker
        </Link>
        {employee.employmentStatus !== "New Hire" && (
          <button
            type="button"
            className="rounded-md bg-hris-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-hris-accentDark"
            onClick={() => {
              const { caseCreated } = updateEmployee(employee.id, {
                employmentStatus: "New Hire",
              });
              alert(
                caseCreated
                  ? "Status set to New Hire. Onboarding case created in OneFlow."
                  : "Status set to New Hire. Existing onboarding case reused (no duplicate)."
              );
            }}
          >
            Mark as New Hire
          </button>
        )}
        {onb && (
          <Link
            href={`/oneflow/cases/${onb.id}`}
            className="rounded-md bg-hris-ink px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open OneFlow case
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-hris-line bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg">Worker profile</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-hris-line bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg">Onboarding handoff</h2>
          <p className="mt-2 text-sm text-slate-500">
            Requires onboarding:{" "}
            <strong>{employee.requiresOnboarding ? "Yes" : "No"}</strong>
          </p>
          {onb ? (
            <div className="mt-4 rounded-lg bg-hris-soft p-3 text-sm">
              <p className="font-semibold text-hris-accentDark">{onb.caseNumber}</p>
              <p className="text-xs text-slate-600">
                Progress {onb.overallProgress}% · {onb.status}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No onboarding case yet. Set status to New Hire to generate one.
            </p>
          )}
        </div>
      </div>
    </WorkdayShell>
  );
}
