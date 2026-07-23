"use client";

import { useRouter } from "next/navigation";
import { WorkdayShell } from "@/components/workday/shell";
import { EmployeeForm } from "@/components/workday/employee-form";
import { useData } from "@/components/shared/data-provider";

export default function CreateEmployeePage() {
  const { createEmployee } = useData();
  const router = useRouter();

  return (
    <WorkdayShell
      title="Create worker"
      subtitle="New worker record in PPG Workday"
    >
      <div className="max-w-3xl rounded-xl border border-hris-line bg-white p-5 shadow-sm">
        <EmployeeForm
          submitLabel="Save worker"
          onSubmit={(values) => {
            const { employee, caseCreated } = createEmployee({
              ...values,
              preferredName:
                values.preferredName || values.fullName.split(" ")[0],
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
                  ? `Worker saved as Offboarding.\nOffboarding case created in OneFlow.`
                  : `Worker saved as New Hire.\nOnboarding case created in OneFlow.`
              );
            }
            router.push(`/workday/employees/${employee.id}`);
          }}
        />
      </div>
    </WorkdayShell>
  );
}
