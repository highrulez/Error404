"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip, ProgressBar } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";

export default function EmployeeSafeOffboardingPage({
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
      ? service.getEmployeeSafeOffboardingCase(session, caseId)
      : null;

  useEffect(() => {
    if (!result || result.ok) return;
    if (result.redirectCaseId) {
      router.replace(`/oneflow/my-offboarding/${result.redirectCaseId}`);
    } else {
      router.replace("/oneflow/my-offboarding");
    }
  }, [result, router]);

  if (!session) return null;

  if (session.role !== "OFFBOARDING_EMPLOYEE" && session.role !== "Admin") {
    return (
      <OneFlowShell title="My Offboarding">
        <p className="text-sm text-slate-500">
          Use the internal case view for department work.
        </p>
        <Link
          href={`/oneflow/offboarding/cases/${caseId}`}
          className="text-sm text-flow-accent underline"
        >
          Open internal case
        </Link>
      </OneFlowShell>
    );
  }

  if (!result?.ok) {
    return (
      <OneFlowShell title="My Offboarding">
        <p className="text-sm text-slate-500">
          {result?.error || "Loading…"}
        </p>
      </OneFlowShell>
    );
  }

  const data = result.data;

  return (
    <OneFlowShell title="My Offboarding" subtitle={data.caseNumber}>
      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Journey Summary</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Case reference" value={data.caseNumber} />
          <Row label="Employee" value={data.employeeName} />
          <Row label="Employee ID" value={data.employeeNumber} />
          <Row
            label="Last working date"
            value={
              data.lastWorkingDate ? formatDate(data.lastWorkingDate) : "—"
            }
          />
          <Row label="Status" value={data.status} />
          <Row label="Clearance" value={data.clearanceStatus} />
        </dl>
        <div className="mt-3">
          <p className="mb-1 text-xs text-slate-500">Your action progress</p>
          <ProgressBar value={data.employeeActionProgress} tone="blue" />
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">My Required Actions</h2>
        <ul className="space-y-2">
          {data.myTasks
            .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
            .map((t) => (
              <li key={t.id}>
                <Link
                  href={t.href}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-flow-line px-3 py-2 text-sm hover:border-flow-accent"
                >
                  <span className="font-medium">{t.title}</span>
                  <StatusChip status={t.status} />
                </Link>
              </li>
            ))}
          {data.myTasks.filter(
            (t) => t.status !== "Completed" && t.status !== "Cancelled"
          ).length === 0 && (
            <li className="text-sm text-slate-400">No open actions.</li>
          )}
        </ul>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">My Forms</h2>
        <div className="space-y-2">
          {data.forms.map((f) => (
            <Link
              key={f.id}
              href={f.href}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-flow-line px-3 py-2 text-sm hover:border-flow-accent"
            >
              <span className="font-medium">{f.formName}</span>
              <StatusChip status={f.status} />
            </Link>
          ))}
          {data.forms.length === 0 && (
            <p className="text-sm text-slate-400">No forms assigned yet.</p>
          )}
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Return and Clearance Summary</h2>
        <div className="flex flex-wrap gap-2">
          <StatusChip status={data.clearanceStatus} />
          <StatusChip status={data.assetReturnStatus} />
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Help and Contacts</h2>
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
          {data.activity.map((a) => (
            <li key={a.id} className="border-b border-slate-100 pb-2">
              <p className="font-medium">{a.action}</p>
              <p className="text-xs text-slate-500">
                {new Date(a.timestamp).toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">{a.detail}</p>
            </li>
          ))}
          {data.activity.length === 0 && (
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
