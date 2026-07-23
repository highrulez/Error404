"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import type { ExitClearanceTemplateItem } from "@/data";

export default function ExitClearanceTemplatesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { ready, service, refresh, store } = useData();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/oneflow/my-tasks");
    }
  }, [session, router]);

  if (!session || session.role !== "Admin") {
    return (
      <OneFlowShell title="Exit Clearance Templates">
        <p className="text-sm text-slate-500">Admin only…</p>
      </OneFlowShell>
    );
  }

  const templates = ready
    ? [...service.listExitClearanceTemplates()].sort(
        (a, b) => a.sortOrder - b.sortOrder
      )
    : [];

  const toggle = (item: ExitClearanceTemplateItem) => {
    const r = service.setExitClearanceTemplateActive(
      session,
      item.id,
      !item.active
    );
    setMessage(r.ok ? `${item.title} ${!item.active ? "activated" : "deactivated"}.` : r.error);
    refresh();
  };

  return (
    <OneFlowShell
      title="Employee Exit Clearance Form Template"
      subtitle="Template changes apply to future offboarding cases only"
    >
      {message && (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}
      <p className="mb-3 text-xs text-slate-500">
        {templates.length} template items · store v{store.version}
      </p>
      <div className="overflow-x-auto rounded-xl border border-flow-line bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Confirmation dept</th>
              <th className="px-3 py-2">Role / email</th>
              <th className="px-3 py-2">Always confirm</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{t.sequenceNumber}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.description}</p>
                  {t.conditionalFields.length > 0 && (
                    <p className="text-[10px] text-slate-400">
                      Conditional:{" "}
                      {t.conditionalFields.map((f) => f.label).join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{t.confirmationDepartment}</td>
                <td className="px-3 py-2 text-xs">
                  {t.confirmationRole}
                  <br />
                  {t.assignmentEmailRule === "Employee Manager Email"
                    ? "Manager email"
                    : t.fixedAssignedEmail}
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.alwaysRequiresConfirmation ? "Yes" : "No"}
                </td>
                <td className="px-3 py-2">
                  <StatusChip status={t.active ? "Active" : "Inactive"} />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-flow-accent"
                    onClick={() => toggle(t)}
                  >
                    {t.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OneFlowShell>
  );
}
