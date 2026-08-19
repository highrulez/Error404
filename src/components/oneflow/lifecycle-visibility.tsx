import type { ChecklistTask } from "@/data";
import { ProgressBar, StatusChip } from "@/components/shared/status";

type LifecycleType = "Onboarding" | "Offboarding";

const STAGES: Record<LifecycleType, string[]> = {
  Onboarding: [
    "Employee Created",
    "HR Validation",
    "Manager Preparation",
    "IT Provisioning",
    "Operational Readiness",
    "Day 1 Ready",
  ],
  Offboarding: [
    "Exit Initiated",
    "Manager Handover",
    "IT Access Removal",
    "Asset Return",
    "Department Clearance",
    "Employment Closed",
  ],
};

function isOpen(task: ChecklistTask) {
  return task.status !== "Completed" && task.status !== "Cancelled";
}

export function lifecycleReadiness(tasks: ChecklistTask[]) {
  const applicable = tasks.filter((task) => task.status !== "Cancelled");
  const completed = applicable.filter((task) => task.status === "Completed").length;
  return applicable.length ? Math.round((completed / applicable.length) * 100) : 0;
}

export function LifecycleVisibility({
  type,
  tasks,
}: {
  type: LifecycleType;
  tasks: ChecklistTask[];
}) {
  const readiness = lifecycleReadiness(tasks);
  const title = type === "Onboarding" ? "Day 1 Readiness" : "Exit Clearance";
  const teams = [...new Set(tasks.map((task) => task.responsibleTeam))];
  const stages = STAGES[type];
  const currentStage = Math.min(
    stages.length - 1,
    Math.floor((readiness / 100) * stages.length)
  );

  return (
    <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{readiness}%</p>
        </div>
        <p className="text-xs text-slate-500">Derived from applicable lifecycle tasks</p>
      </div>
      <div className="mt-2"><ProgressBar value={readiness} tone="blue" /></div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stages.map((stage, index) => {
          const state = readiness === 100 || index < currentStage ? "Complete" : index === currentStage ? "Current" : "Pending";
          return (
            <div key={stage} className="flex items-center gap-2 text-xs">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${state === "Complete" ? "bg-emerald-100 text-emerald-800" : state === "Current" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
              <span className="font-medium">{stage}</span>
              {index < stages.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const teamTasks = tasks.filter((task) => task.responsibleTeam === team);
          const open = teamTasks.filter(isOpen);
          const status = !open.length ? "Completed" : open.some((task) => task.status === "Blocked") ? "Blocked" : open.some((task) => task.status === "In Progress") ? "In Progress" : "Pending";
          return <div key={team} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"><span className="truncate">{team}</span><StatusChip status={status} /></div>;
        })}
      </div>
    </div>
  );
}
