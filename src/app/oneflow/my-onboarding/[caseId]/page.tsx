"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function EmployeeSafeOnboardingPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const { session } = useAuth();
  const { ready, service } = useData();
  const router = useRouter();

  const result =
    ready && session
      ? service.getEmployeeOnboardingSummary(session, caseId)
      : null;

  useEffect(() => {
    if (!result || result.ok) return;
    if (result.redirectCaseId) {
      router.replace(`/oneflow/my-onboarding/${result.redirectCaseId}`);
    } else {
      router.replace("/oneflow/my-onboarding");
    }
  }, [result, router]);

  if (!session) return null;

  if (session.role !== "ONBOARDING_EMPLOYEE" && session.role !== "Admin") {
    return (
      <OneFlowShell title="My Onboarding">
        <p className="text-sm text-slate-500">
          Use the internal case view for department work.
        </p>
        <Link
          href={`/oneflow/cases/${caseId}`}
          className="text-sm text-flow-accent underline"
        >
          Open internal case
        </Link>
      </OneFlowShell>
    );
  }

  if (!result?.ok) {
    return (
      <OneFlowShell title="My Onboarding">
        <p className="text-sm text-slate-500">{result?.error || "Loading…"}</p>
      </OneFlowShell>
    );
  }

  const data = result.data;
  const days =
    data.daysUntilImportantDate != null
      ? data.daysUntilImportantDate
      : undefined;

  return (
    <OneFlowShell title="My Onboarding" subtitle={data.caseReference}>
      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Welcome, {data.employeeName}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Complete your required actions before your first day at PPG.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Employee ID" value={data.employeeNumber} />
          <Row label="Job title" value={data.jobTitle} />
          <Row label="Department" value={data.department} />
          <Row label="Location" value={data.location} />
          <Row label="Manager" value={data.managerName} />
          <Row
            label="Start date"
            value={
              data.importantDate ? formatDate(data.importantDate) : "—"
            }
          />
          <Row
            label="Days until start"
            value={
              days == null
                ? "—"
                : days === 0
                  ? "Today"
                  : days > 0
                    ? `${days} day${days === 1 ? "" : "s"}`
                    : `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
            }
          />
          <Row label="Current stage" value={String(data.currentStage)} />
          <Row label="Status" value={data.employeeStatus} />
        </dl>
      </section>

      <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">My Required Actions</h2>
          <p className="mt-1 text-sm text-slate-600">
            {data.employeeActionsCompleted} of {data.employeeActionsTotal}{" "}
            completed
          </p>
          <div className="mt-3">
            <ProgressBar value={data.employeeActionProgress} tone="blue" />
          </div>
        </div>
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Company Preparation</h2>
          <div className="mt-2">
            <StatusChip
              status={data.companyPreparationStatus || "In Progress"}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Account setup, equipment, and access preparation are handled by PPG
            teams.
          </p>
        </div>
        <div className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Equipment Preparation</h2>
          <div className="mt-2">
            <StatusChip
              status={data.equipmentStatus || "Awaiting manager decision"}
            />
          </div>
          {data.equipmentEstimatedReadiness &&
            data.equipmentStatus &&
            (data.equipmentStatus === "Laptop ordered" ||
              data.equipmentStatus === "Equipment preparation in progress" ||
              data.equipmentStatus ===
                "Equipment is being prepared for your first day" ||
              data.equipmentStatus === "Temporary laptop prepared" ||
              data.equipmentStatus === "New laptop assigned" ||
              data.equipmentStatus === "Ready for Day One") && (
              <p className="mt-2 text-xs text-slate-600">
                Estimated readiness:{" "}
                {formatDate(data.equipmentEstimatedReadiness)}
              </p>
            )}
          <p className="mt-2 text-xs text-slate-500">
            Equipment status only — financial and purchase details are not shown
            here.
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Required forms</h2>
        <ul className="space-y-2">
          {data.forms.map((f) => (
            <li key={f.id}>
              <Link
                href={f.href}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-flow-line px-3 py-2 text-sm hover:border-flow-accent"
              >
                <span className="font-medium">{f.formName}</span>
                <StatusChip status={f.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">
          Required acknowledgements &amp; actions
        </h2>
        <ul className="space-y-2">
          {data.employeeTasks.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-flow-line px-3 py-2 text-sm hover:border-flow-accent"
              >
                <span>
                  <span className="font-medium">{t.title}</span>
                  <span className="ml-2 text-xs text-slate-500">{t.taskType}</span>
                </span>
                <StatusChip status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {data.firstDay && (
        <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">First-day information</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row
              label="Reporting date"
              value={formatDate(data.firstDay.reportingDate)}
            />
            <Row label="Reporting time" value={data.firstDay.reportingTime} />
            <Row label="Office" value={data.firstDay.officeLocation} />
            <Row label="Manager" value={data.firstDay.managerName} />
            <Row label="Contact" value={data.firstDay.contactPerson} />
            <Row label="Dress code" value={data.firstDay.dressCode} />
          </dl>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Items to bring
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {data.firstDay.itemsToBring.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            {data.firstDay.parkingOrArrival}
          </p>
        </section>
      )}

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">
          HR and Administration contacts
        </h2>
        <ul className="space-y-1 text-sm">
          {data.contacts.map((c) => (
            <li key={c.email}>
              <span className="text-slate-500">{c.label}:</span> {c.email}
            </li>
          ))}
        </ul>
        <Link
          href="/oneflow/inbox"
          className="mt-3 inline-block text-sm text-flow-accent underline"
        >
          Open My Inbox
        </Link>
      </section>

      <section className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">My Activity</h2>
        <ul className="space-y-2 text-sm">
          {data.safeActivities.map((a) => (
            <li key={a.id} className="border-b border-slate-100 pb-2">
              <p className="font-medium">{a.action}</p>
              <p className="text-xs text-slate-500">
                {new Date(a.timestamp).toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">{a.detail}</p>
            </li>
          ))}
          {data.safeActivities.length === 0 && (
            <li className="text-slate-400">No activity yet.</li>
          )}
        </ul>
      </section>
    </OneFlowShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
