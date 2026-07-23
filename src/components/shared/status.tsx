import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Action: "bg-sky-100 text-sky-800",
  Approval: "bg-violet-100 text-violet-800",
  Confirmation: "bg-amber-100 text-amber-900",
  Review: "bg-indigo-100 text-indigo-800",
  Information: "bg-slate-100 text-slate-700",
  Approved: "bg-emerald-100 text-emerald-800",
  Acknowledged: "bg-emerald-100 text-emerald-800",
  Reviewed: "bg-indigo-100 text-indigo-800",
  None: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-200 text-slate-600",
  "Under HR Review": "bg-sky-100 text-sky-800",
  "Under Administration Review": "bg-sky-100 text-sky-800",
  "Card Issued": "bg-emerald-100 text-emerald-800",
  "Form Pending": "bg-slate-100 text-slate-700",
  "Form Submitted": "bg-indigo-100 text-indigo-800",
  "Awaiting Department Review": "bg-sky-100 text-sky-800",
  "Return Scheduled": "bg-amber-100 text-amber-900",
  "Clearance In Progress": "bg-sky-100 text-sky-800",
  Cleared: "bg-emerald-100 text-emerald-800",
  "Pre-Hire": "bg-slate-100 text-slate-700",
  "New Hire": "bg-teal-100 text-teal-800",
  Active: "bg-emerald-100 text-emerald-800",
  Inactive: "bg-slate-200 text-slate-600",
  Required: "bg-indigo-100 text-indigo-800",
  Optional: "bg-slate-100 text-slate-600",
  Escalated: "bg-rose-100 text-rose-800",
  Scheduled: "bg-sky-100 text-sky-800",
  Immediate: "bg-rose-100 text-rose-800",
  "Manual Confirmation": "bg-slate-100 text-slate-700",
  Ready: "bg-sky-100 text-sky-800",
  "Reminder Sent": "bg-violet-100 text-violet-800",
  Stopped: "bg-slate-200 text-slate-600",
  "Not Required": "bg-slate-100 text-slate-500",
  Offboarding: "bg-amber-100 text-amber-900",
  "Awaiting Last Day": "bg-amber-100 text-amber-900",
  "Access Removal In Progress": "bg-orange-100 text-orange-900",
  "Clearance Pending": "bg-sky-100 text-sky-800",
  "Attention Required": "bg-amber-100 text-amber-900",
  "Security Risk": "bg-orange-100 text-orange-900",
  Normal: "bg-emerald-100 text-emerald-800",
  Onboarding: "bg-teal-100 text-teal-800",
  Terminated: "bg-rose-100 text-rose-800",
  Pending: "bg-slate-100 text-slate-700",
  "In Progress": "bg-sky-100 text-sky-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Overdue: "bg-rose-100 text-rose-800",
  Blocked: "bg-amber-100 text-amber-900",
  "Not Started": "bg-slate-100 text-slate-600",
  "On Hold": "bg-amber-50 text-amber-800",
  "Not Sent": "bg-slate-100 text-slate-600",
  Sent: "bg-emerald-100 text-emerald-800",
  Opened: "bg-sky-100 text-sky-800",
  Draft: "bg-amber-50 text-amber-800",
  Submitted: "bg-indigo-100 text-indigo-800",
  "Confirmation In Progress": "bg-sky-100 text-sky-800",
  "Returned for Correction": "bg-amber-100 text-amber-900",
  "Fully Cleared": "bg-emerald-100 text-emerald-800",
  Yes: "bg-emerald-100 text-emerald-800",
  No: "bg-slate-100 text-slate-700",
  "Not Selected": "bg-slate-100 text-slate-500",
  Confirmed: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
  Failed: "bg-rose-100 text-rose-800",
  Simulated: "bg-violet-100 text-violet-800",
  "Successful": "bg-emerald-100 text-emerald-800",
  Running: "bg-sky-100 text-sky-800",
  Unread: "bg-sky-100 text-sky-800",
  Read: "bg-slate-100 text-slate-600",
  Critical: "bg-rose-100 text-rose-800",
  High: "bg-amber-100 text-amber-900",
  Medium: "bg-slate-100 text-slate-700",
  Low: "bg-slate-50 text-slate-500",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {status}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "teal",
}: {
  value: number;
  tone?: "teal" | "blue";
}) {
  const bar = tone === "blue" ? "bg-flow-accent" : "bg-hris-accent";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={cn("h-full rounded-full transition-all", bar)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
