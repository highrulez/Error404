"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function AssetsAwaitingReturnPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, store } = useData();

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  const rows = useMemo(() => {
    if (!ready) return [];
    return store.tasks
      .filter(
        (t) =>
          t.processType === "Offboarding" &&
          /recover|asset inventory|backup|wipe/i.test(t.title) &&
          t.status !== "Completed" &&
          t.status !== "Blocked"
      )
      .map((t) => {
        const employee = store.employees.find((e) => e.id === t.employeeId);
        const offCase = store.offboardingCases.find(
          (c) => c.id === t.offboardingCaseId
        );
        return { task: t, employee, offCase };
      })
      .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
  }, [ready, store.tasks, store.employees, store.offboardingCases]);

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Assets awaiting return">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </OneFlowShell>
    );
  }

  return (
    <OneFlowShell
      title="Assets awaiting return"
      subtitle="Open asset recovery tasks across offboarding cases"
    >
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/oneflow/offboarding" className="text-flow-accent hover:underline">
          ← Back to offboarding overview
        </Link>
      </p>

      <div className="overflow-hidden rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ task, employee, offCase }) => (
              <tr key={task.id} className="border-t border-flow-line">
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3">{employee?.fullName ?? "—"}</td>
                <td className="px-4 py-3">
                  {offCase ? (
                    <Link
                      href={`/oneflow/offboarding/cases/${offCase.id}`}
                      className="font-semibold text-flow-accent hover:underline"
                    >
                      {offCase.caseNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{task.responsibleTeam}</td>
                <td className="px-4 py-3">{formatDate(task.dueDate)}</td>
                <td className="px-4 py-3">
                  <StatusChip status={task.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={6}>
                  No open asset return tasks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
