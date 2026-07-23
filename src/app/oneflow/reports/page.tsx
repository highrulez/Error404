"use client";

import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";

export default function ReportsPage() {
  const { session } = useAuth();
  const { ready, service } = useData();
  if (!session) return null;
  if (session.role !== "Admin" && session.role !== "HR") {
    return (
      <OneFlowShell title="Reports">
        <p className="text-sm text-slate-500">Not authorized.</p>
      </OneFlowShell>
    );
  }

  const stats = ready ? service.getDashboardStats() : null;

  return (
    <OneFlowShell title="Reports" subtitle="Operational snapshot">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "New hires", value: stats?.newHires ?? "—" },
          { label: "Open cases", value: stats?.openCases ?? "—" },
          { label: "Completed tasks", value: stats?.completedTasks ?? "—" },
          { label: "Overdue tasks", value: stats?.overdueTasks ?? "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-flow-line bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/oneflow/automation-runs" className="text-flow-accent underline">
          Automation Runs
        </Link>
        <Link href="/oneflow/offboarding" className="text-flow-accent underline">
          Offboarding dashboard
        </Link>
        <Link href="/oneflow/my-tasks" className="text-flow-accent underline">
          My Tasks queue
        </Link>
      </div>
    </OneFlowShell>
  );
}
