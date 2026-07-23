"use client";

import { useState } from "react";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import type { ChecklistTask, Employee } from "@/data";
import type {
  LaptopNotRequiredReason,
  LaptopRequest,
  LaptopRequirementType,
} from "@/data/laptop-request-types";

const NO_REASONS: LaptopNotRequiredReason[] = [
  "Existing laptop will be reassigned",
  "Employee does not require a laptop",
  "Employee uses shared workstation",
  "Contractor provides own equipment",
  "Other",
];

const REQUIREMENT_TYPES: LaptopRequirementType[] = [
  "Standard Laptop",
  "High Performance Laptop",
  "Developer Laptop",
  "Existing Laptop Reassignment",
  "Special Requirement",
];

const ONSITE_STATUSES = [
  "Pending",
  "Awaiting Delivery",
  "Device Received",
  "Configuration In Progress",
  "Ready for Collection",
  "Completed",
] as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-40 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export function LaptopDecisionPanel({
  task,
  employee,
  request,
  onDone,
}: {
  task: ChecklistTask;
  employee?: Employee;
  request: LaptopRequest;
  onDone: (message: string) => void;
}) {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const closed = task.status === "Completed" || task.status === "Cancelled";
  const [choice, setChoice] = useState<"yes" | "no" | null>(
    request.managerDecision === "Yes"
      ? "yes"
      : request.managerDecision === "No"
        ? "no"
        : null
  );
  const [reason, setReason] = useState(request.managerDecisionReason || "");
  const [remarks, setRemarks] = useState(request.managerRemarks || "");
  const [credit, setCredit] = useState(request.departmentCreditNumber || "");
  const [costCentre, setCostCentre] = useState(request.costCentre || "");
  const [reqType, setReqType] = useState<LaptopRequirementType>(
    request.laptopRequirementType || "Standard Laptop"
  );
  const [delivery, setDelivery] = useState(request.requiredDeliveryDate || "");
  const [justification, setJustification] = useState(
    request.businessJustification || ""
  );
  const [spec, setSpec] = useState(request.requestedSpecification || "");
  const [model, setModel] = useState(request.standardModelRequested || "");
  const [lateReason, setLateReason] = useState("");

  if (!session) return null;

  const name = request.employeeName || employee?.fullName || "the employee";

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Laptop Requirement Decision
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {name} · {employee?.role || "—"} · {employee?.department || "—"} ·{" "}
          {employee?.location || "—"} · Start{" "}
          {employee ? formatDate(employee.startDate) : "—"}
        </p>
      </div>

      <fieldset disabled={closed} className="space-y-3">
        <p className="text-sm font-medium text-slate-800">
          Does {name} require a new laptop?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              choice === "yes"
                ? "border-flow-accent bg-flow-accentSoft text-flow-accent"
                : "border-flow-line bg-white"
            }`}
            onClick={() => setChoice("yes")}
          >
            Yes – New laptop required
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              choice === "no"
                ? "border-flow-accent bg-flow-accentSoft text-flow-accent"
                : "border-flow-line bg-white"
            }`}
            onClick={() => setChoice("no")}
          >
            No – Laptop not required
          </button>
        </div>

        {choice === "no" && (
          <div className="space-y-3 rounded-lg border border-flow-line bg-slate-50 p-3">
            <label className="block text-xs font-semibold text-slate-600">
              Decision reason
              <select
                className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Select reason</option>
                {NO_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Optional remarks
              <textarea
                className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const r = service.submitLaptopNotRequired(session, request.id, {
                  reason,
                  remarks,
                });
                onDone(r.ok ? "Laptop not required — decision recorded." : r.error);
                if (r.ok) refresh();
              }}
            >
              Confirm No Laptop Required
            </button>
          </div>
        )}

        {choice === "yes" && (
          <div className="space-y-3 rounded-lg border border-flow-line bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                Department Credit Number *
                <input
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Cost Centre *
                <input
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={costCentre}
                  onChange={(e) => setCostCentre(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Laptop Requirement Type *
                <select
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={reqType}
                  onChange={(e) =>
                    setReqType(e.target.value as LaptopRequirementType)
                  }
                >
                  {REQUIREMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Required Delivery Date *
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                Business Justification *
                <textarea
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Preferred Standard Model
                <input
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Requested Specification
                {reqType === "Special Requirement" ? " *" : ""}
                <input
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                />
              </label>
              {employee && delivery > employee.startDate && (
                <label className="block text-xs font-semibold text-amber-700 sm:col-span-2">
                  Delivery after start date — reason required
                  <input
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                  />
                </label>
              )}
              <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                Manager Remarks
                <textarea
                  className="mt-1 w-full rounded-md border border-flow-line bg-white px-3 py-2 text-sm font-normal"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const r = service.submitLaptopRequired(session, request.id, {
                  departmentCreditNumber: credit,
                  costCentre,
                  laptopRequirementType: reqType,
                  requiredDeliveryDate: delivery,
                  businessJustification: justification,
                  requestedSpecification: spec,
                  standardModelRequested: model,
                  managerRemarks: remarks,
                  lateDeliveryReason: lateReason,
                });
                onDone(r.ok ? "Laptop request submitted to Administration." : r.error);
                if (r.ok) refresh();
              }}
            >
              Submit Laptop Request
            </button>
          </div>
        )}
      </fieldset>

      {closed && (
        <p className="text-xs text-slate-500">
          Decision recorded: {request.managerDecision || "—"} ·{" "}
          {request.requestStatus}
        </p>
      )}
    </div>
  );
}

export function LaptopProcurementPanel({
  task,
  employee,
  request,
  onDone,
}: {
  task: ChecklistTask;
  employee?: Employee;
  request: LaptopRequest;
  onDone: (message: string) => void;
}) {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const closed = task.status === "Completed" || task.status === "Cancelled";
  const [vendor, setVendor] = useState(request.vendorName || "");
  const [quote, setQuote] = useState(request.quotationReference || "");
  const [poNumber, setPoNumber] = useState(request.purchaseOrderNumber || "");
  const [poDate, setPoDate] = useState(
    request.purchaseOrderDate || new Date().toISOString().slice(0, 10)
  );
  const [estDelivery, setEstDelivery] = useState(
    request.estimatedDeliveryDate || request.requiredDeliveryDate || ""
  );
  const [remarks, setRemarks] = useState(request.procurementRemarks || "");
  const [returnReason, setReturnReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  if (!session) return null;
  const isAdmin = session.role === "Admin";

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Create Laptop Purchase Order</h2>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <StatusChip status={request.requestStatus} />
          <StatusChip status={task.status} />
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          A. Employee
        </h3>
        <dl className="space-y-1">
          <Row label="Employee" value={request.employeeName} />
          <Row label="Employee ID" value={employee?.employeeNumber || "—"} />
          <Row label="Job title" value={employee?.role || "—"} />
          <Row label="Department" value={employee?.department || "—"} />
          <Row
            label="Start date"
            value={employee ? formatDate(employee.startDate) : "—"}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          B. Manager Request
        </h3>
        <dl className="space-y-1">
          <Row label="Manager" value={request.managerName} />
          <Row label="Department credit" value={request.departmentCreditNumber} />
          <Row label="Cost centre" value={request.costCentre} />
          <Row label="Requirement type" value={request.laptopRequirementType} />
          <Row
            label="Specification"
            value={
              request.requestedSpecification ||
              request.standardModelRequested ||
              "—"
            }
          />
          <Row
            label="Required delivery"
            value={
              request.requiredDeliveryDate
                ? formatDate(request.requiredDeliveryDate)
                : "—"
            }
          />
          <Row label="Justification" value={request.businessJustification} />
          <Row label="Manager remarks" value={request.managerRemarks || "—"} />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          C. Purchase Order
        </h3>
        <fieldset disabled={closed || !isAdmin} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Vendor Name *
            <input
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Quotation Reference
            <input
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Purchase Order Number *
            <input
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Purchase Order Date *
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={poDate}
              onChange={(e) => setPoDate(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Estimated Delivery Date *
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={estDelivery}
              onChange={(e) => setEstDelivery(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Procurement Remarks
            <textarea
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </label>
        </fieldset>
      </section>

      {!closed && isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-flow-line px-3 py-2 text-sm font-semibold"
            onClick={() => {
              const r = service.saveLaptopProcurementDraft(session, request.id, {
                vendorName: vendor,
                quotationReference: quote,
                purchaseOrderNumber: poNumber,
                purchaseOrderDate: poDate,
                estimatedDeliveryDate: estDelivery,
                procurementRemarks: remarks,
              });
              onDone(r.ok ? "Draft saved. Procurement started." : r.error);
              if (r.ok) refresh();
            }}
          >
            Start Procurement / Save Draft
          </button>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const r = service.confirmLaptopPurchaseOrder(session, request.id, {
                vendorName: vendor,
                quotationReference: quote,
                purchaseOrderNumber: poNumber,
                purchaseOrderDate: poDate,
                estimatedDeliveryDate: estDelivery,
                procurementRemarks: remarks,
              });
              onDone(r.ok ? "PO created — Onsite IT notified." : r.error);
              if (r.ok) refresh();
            }}
          >
            Confirm PO Created
          </button>
          <button
            type="button"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
            onClick={() => setShowReturn((v) => !v)}
          >
            Return to Manager for Correction
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900"
            onClick={() => setShowCancel((v) => !v)}
          >
            Cancel Request
          </button>
        </div>
      )}

      {showReturn && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <input
            className="w-full rounded border border-amber-300 px-3 py-2 text-sm"
            placeholder="Correction reason (required)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => {
              const r = service.returnLaptopRequestToManager(
                session,
                request.id,
                returnReason
              );
              onDone(r.ok ? "Returned to manager for correction." : r.error);
              if (r.ok) refresh();
            }}
          >
            Submit return
          </button>
        </div>
      )}

      {showCancel && (
        <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
          <input
            className="w-full rounded border border-rose-300 px-3 py-2 text-sm"
            placeholder="Cancel reason (required)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => {
              const r = service.cancelLaptopRequest(
                session,
                request.id,
                cancelReason
              );
              onDone(r.ok ? "Laptop request cancelled." : r.error);
              if (r.ok) refresh();
            }}
          >
            Confirm cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function LaptopPreparePanel({
  task,
  employee,
  request,
  onDone,
}: {
  task: ChecklistTask;
  employee?: Employee;
  request: LaptopRequest;
  onDone: (message: string) => void;
}) {
  const { session } = useAuth();
  const { service, refresh } = useData();
  const closed = task.status === "Completed" || task.status === "Cancelled";
  const [status, setStatus] = useState<(typeof ONSITE_STATUSES)[number]>(
    (request.onsiteStatus as (typeof ONSITE_STATUSES)[number]) || "Pending"
  );

  if (!session) return null;

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Prepare Laptop</h2>
      <dl className="space-y-1">
        <Row label="Employee" value={request.employeeName} />
        <Row label="Job title" value={employee?.role || "—"} />
        <Row label="Department" value={employee?.department || "—"} />
        <Row
          label="Start date"
          value={employee ? formatDate(employee.startDate) : "—"}
        />
        <Row label="Requirement type" value={request.laptopRequirementType} />
        <Row
          label="Approved specification"
          value={
            request.requestedSpecification ||
            request.standardModelRequested ||
            "Standard"
          }
        />
        <Row
          label="Estimated delivery"
          value={
            request.estimatedDeliveryDate
              ? formatDate(request.estimatedDeliveryDate)
              : "—"
          }
        />
      </dl>
      {!closed && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-semibold text-slate-600">
            Preparation status
            <select
              className="mt-1 block rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof ONSITE_STATUSES)[number])
              }
            >
              {ONSITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              const r = service.updateLaptopEquipmentStatus(
                session,
                request.id,
                status
              );
              onDone(r.ok ? `Status updated: ${status}` : r.error);
              if (r.ok) refresh();
            }}
          >
            Update Status
          </button>
        </div>
      )}
    </div>
  );
}
