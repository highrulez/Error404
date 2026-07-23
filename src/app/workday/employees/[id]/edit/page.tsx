"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WorkdayShell } from "@/components/workday/shell";
import {
  EmployeeForm,
  employeeToForm,
} from "@/components/workday/employee-form";
import { useData } from "@/components/shared/data-provider";

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { store, updateEmployee } = useData();
  const router = useRouter();
  const employee = store.employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <WorkdayShell title="Worker not found">
        <Link href="/workday" className="text-sm text-hris-accentDark underline">
          Back to list
        </Link>
      </WorkdayShell>
    );
  }

  return (
    <WorkdayShell
      title={`Edit · ${employee.fullName}`}
      subtitle={employee.employeeNumber}
    >
      <div className="max-w-3xl rounded-xl border border-hris-line bg-white p-5 shadow-sm">
        <EmployeeForm
          initial={employeeToForm(employee)}
          submitLabel="Save changes"
          onSubmit={(values) => {
            const { caseCreated } = updateEmployee(employee.id, {
              ...values,
              lastWorkingDate: values.lastWorkingDate || null,
              terminationType:
                values.employmentStatus === "Offboarding"
                  ? values.terminationType
                  : null,
              terminationReason:
                values.employmentStatus === "Offboarding"
                  ? values.terminationReason
                  : null,
              immediateAccessRemovalRequired:
                values.employmentStatus === "Offboarding"
                  ? values.immediateAccessRemovalRequired
                  : false,
            });
            if (caseCreated) {
              alert(
                values.employmentStatus === "Offboarding"
                  ? "Changes saved. Offboarding status created an offboarding case in OneFlow."
                  : "Changes saved. New Hire status created an onboarding case in OneFlow."
              );
            }
            router.push(`/workday/employees/${employee.id}`);
          }}
        />
      </div>
    </WorkdayShell>
  );
}
