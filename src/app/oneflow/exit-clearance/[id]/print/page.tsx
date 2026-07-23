"use client";

import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/components/shared/data-provider";

export default function ExitClearancePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  const mode = search.get("mode") || "blank";
  const { ready, service } = useData();
  const form = ready ? service.getExitClearanceForm(id) : undefined;

  const title = useMemo(() => {
    if (mode === "completed") return "Completed Employee Exit Clearance Form";
    if (mode === "submitted") return "Submitted Employee Exit Clearance Form";
    return "Employee Exit Clearance Form (Blank / Working Copy)";
  }, [mode]);

  if (!form) {
    return <p className="p-6 text-sm">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-slate-900 print:p-0">
      <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
        <Link href={`/oneflow/exit-clearance/${form.id}`} className="text-sm text-blue-700 underline">
          Back to form
        </Link>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>

      <h1 className="text-center text-lg font-bold uppercase tracking-wide">
        {title}
      </h1>
      <p className="mt-1 text-center text-xs text-slate-500">
        Mock attachment view — browser print only
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 border border-slate-800 p-3 text-xs">
        <p><strong>Employee:</strong> {form.employeeName}</p>
        <p><strong>Employee ID:</strong> {form.employeeNumber}</p>
        <p><strong>Department:</strong> {form.department}</p>
        <p><strong>Location:</strong> {form.location}</p>
        <p><strong>Manager:</strong> {form.managerName}</p>
        <p><strong>Last working date:</strong> {form.lastWorkingDate}</p>
        <p><strong>Personal email:</strong> {form.personalEmail || "—"}</p>
        <p><strong>Contact:</strong> {form.contactNumber || "—"}</p>
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-800 px-2 py-1 text-left">#</th>
            <th className="border border-slate-800 px-2 py-1 text-left">Item</th>
            <th className="border border-slate-800 px-2 py-1">Yes</th>
            <th className="border border-slate-800 px-2 py-1">No</th>
            <th className="border border-slate-800 px-2 py-1 text-left">
              Confirmation from
            </th>
            {(mode === "submitted" || mode === "completed") && (
              <th className="border border-slate-800 px-2 py-1 text-left">
                Confirmation
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {form.checklistItems
            .slice()
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
            .map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-800 px-2 py-1 align-top">
                  {item.sequenceNumber}
                </td>
                <td className="border border-slate-800 px-2 py-1 align-top">
                  <strong>{item.title}</strong>
                  <div className="text-[10px] text-slate-600">{item.description}</div>
                  {mode !== "blank" &&
                    item.employeeAnswer === "Yes" &&
                    Object.keys(item.conditionalValues).length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-[10px]">
                        {Object.entries(item.conditionalValues).map(([k, v]) => (
                          <li key={k}>
                            {k}: {v}
                          </li>
                        ))}
                      </ul>
                    )}
                </td>
                <td className="border border-slate-800 px-2 py-1 text-center">
                  {mode === "blank" ? "☐" : item.employeeAnswer === "Yes" ? "☑" : "☐"}
                </td>
                <td className="border border-slate-800 px-2 py-1 text-center">
                  {mode === "blank" ? "☐" : item.employeeAnswer === "No" ? "☑" : "☐"}
                </td>
                <td className="border border-slate-800 px-2 py-1 align-top">
                  {item.confirmationDepartment}
                </td>
                {(mode === "submitted" || mode === "completed") && (
                  <td className="border border-slate-800 px-2 py-1 align-top text-[10px]">
                    {item.confirmationStatus}
                    {item.confirmationName && (
                      <>
                        <br />
                        {item.confirmationName} ({item.confirmationInitial})
                        <br />
                        {item.confirmationDate}
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>

      <div className="mt-6 border border-slate-800 p-3 text-xs">
        <p className="font-semibold">Employee declaration</p>
        <p className="mt-2">
          {mode === "blank"
            ? "☐"
            : form.employeeDeclarationConfirmed
              ? "☑"
              : "☐"}{" "}
          I confirm that the information provided is accurate and complete…
        </p>
        <p className="mt-3">
          Signature:{" "}
          <em>
            {mode === "blank" ? "________________" : form.employeeTypedSignature || "—"}
          </em>
        </p>
        <p>
          Date:{" "}
          {form.submittedAt?.slice(0, 10) ||
            (mode === "blank" ? "________" : new Date().toISOString().slice(0, 10))}
        </p>
      </div>
    </div>
  );
}
