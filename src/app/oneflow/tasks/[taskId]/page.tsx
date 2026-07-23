"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDate } from "@/lib/utils";
import { profileByEmail, unmetPrerequisiteTitles } from "@/data";
import {
  LaptopDecisionPanel,
  LaptopPreparePanel,
  LaptopProcurementPanel,
} from "@/components/oneflow/laptop-task-panels";
import { InductionPresenterPanel } from "@/components/oneflow/induction-presenter-panel";

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const { session } = useAuth();
  const { ready, store, service, refresh } = useData();
  const [remarks, setRemarks] = useState("");
  const [initials, setInitials] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideOutcome, setOverrideOutcome] = useState<"Confirmed" | "Returned for Correction">(
    "Confirmed"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [piHydrated, setPiHydrated] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showRelated, setShowRelated] = useState(false);

  const access = ready && session ? service.getTaskForUser(session, taskId) : null;
  const task = access?.ok ? access.task : undefined;
  const denied = access && !access.ok ? access.error : null;

  const employee = task ? store.employees.find((e) => e.id === task.employeeId) : undefined;
  const formId = task?.linkedExitClearanceFormId || task?.exitFormId;
  const form = formId && ready ? service.getExitClearanceForm(formId) : undefined;
  const item = form?.checklistItems.find(
    (i) => i.id === (task?.linkedChecklistItemId || task?.exitFormItemId)
  );

  const activity = useMemo(() => {
    if (!task) return [];
    return store.activity
      .filter(
        (a) =>
          a.employeeId === task.employeeId &&
          (a.offboardingCaseId === task.offboardingCaseId ||
            a.onboardingCaseId === task.onboardingCaseId ||
            a.detail.includes(task.id) ||
            a.detail.includes(task.title))
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 20);
  }, [store.activity, task]);

  useEffect(() => {
    if (!session || initials) return;
    const profile = profileByEmail(session.email);
    setInitials(
      profile?.initials ||
        session.name
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 3)
    );
  }, [session, initials]);

  useEffect(() => {
    if (!employee || !task?.isPersonalInfoReviewTask || piHydrated) return;
    setPreferredName(employee.preferredName || "");
    setPersonalEmail(employee.personalEmail || "");
    setPhone(employee.phone || "");
    setEmergencyName(employee.emergencyContactName || "");
    setEmergencyPhone(employee.emergencyContactNumber || "");
    setPiHydrated(true);
  }, [employee, task, piHydrated]);

  // Employee form tasks: prefer opening the related paper form directly
  useEffect(() => {
    if (!task || !session) return;
    const isEmployee =
      session.role === "ONBOARDING_EMPLOYEE" ||
      session.role === "OFFBOARDING_EMPLOYEE";
    if (!isEmployee) return;
    if (task.linkedInductionFormId && task.isInductionEmployeeTask) {
      window.location.replace(
        `/oneflow/my-forms/induction/${task.linkedInductionFormId}`
      );
    } else if (task.linkedAccessCardFormId && task.isAccessCardEmployeeTask) {
      window.location.replace(
        `/oneflow/my-forms/access-card/${task.linkedAccessCardFormId}`
      );
    }
  }, [task, session]);

  if (!session) {
    return (
      <OneFlowShell title="Task">
        <p className="text-sm">Sign in required.</p>
      </OneFlowShell>
    );
  }

  if (denied) {
    return (
      <OneFlowShell title="Task">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {denied}
        </div>
        <Link href="/oneflow/my-tasks" className="mt-3 inline-block text-sm text-flow-accent underline">
          Back to My Tasks
        </Link>
      </OneFlowShell>
    );
  }

  if (!task) {
    return (
      <OneFlowShell title="Task">
        <p className="text-sm text-slate-500">Task not found.</p>
      </OneFlowShell>
    );
  }

  const taskType =
    task.taskType ?? (task.isExitClearanceConfirmation ? "Confirmation" : "Action");
  const lifecycle = task.processType ?? "Onboarding";
  const caseTasks =
    lifecycle === "Offboarding"
      ? store.tasks.filter((t) => t.offboardingCaseId === task.offboardingCaseId)
      : store.tasks.filter((t) => t.onboardingCaseId === task.onboardingCaseId);
  const unmet = unmetPrerequisiteTitles(task, caseTasks);
  const closed = task.status === "Completed" || task.status === "Cancelled";

  const laptopRequestId = task.linkedLaptopRequestId;
  const laptopRequest =
    laptopRequestId && ready
      ? service.getLaptopRequest(laptopRequestId)
      : task.onboardingCaseId && ready
        ? service.getLaptopRequestByCase(task.onboardingCaseId)
        : undefined;
  const isLaptopDecision = Boolean(task.isLaptopDecisionTask);
  const isLaptopProcurement = Boolean(task.isLaptopProcurementTask);
  const isLaptopPrepare = Boolean(task.isLaptopPrepareTask);
  const isLaptopWorkflow = isLaptopDecision || isLaptopProcurement || isLaptopPrepare;
  const isInductionPresenter = Boolean(task.isInductionPresenterTask);
  const inductionFormId =
    task.relatedFormId || task.linkedInductionFormId || null;
  const inductionForm =
    isInductionPresenter && inductionFormId && ready
      ? service.getInductionForm(inductionFormId)
      : undefined;

  const run = (action: Parameters<typeof service.executeTaskWorkflow>[0]["action"]) => {
    const result = service.executeTaskWorkflow({
      taskId: task.id,
      actingUserId: session.userId,
      session,
      action,
      remarks,
      initials,
      outcome: action === "Admin Override Confirmation" ? overrideOutcome : undefined,
      overrideReason:
        action === "Admin Override Confirmation" ? overrideReason : undefined,
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`${action} recorded.`);
    refresh();
  };

  return (
    <OneFlowShell title={task.title} subtitle="Task Detail">
      {message && (
        <div className="mb-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">{message}</div>
      )}

      <div className="mb-3">
        <p className="text-sm text-slate-600">
          {task.employeeName || employee?.fullName || "—"}
          {employee?.role ? ` · ${employee.role}` : ""}
          {task.onboardingCaseId || task.offboardingCaseId
            ? ` · ${lifecycle}`
            : ""}
          {" · Due "}
          {formatDate(task.dueDate)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusChip status={taskType} />
          <StatusChip status={task.status} />
          <StatusChip status={task.priority || "Medium"} />
          {task.outcome && task.outcome !== "None" && (
            <StatusChip status={task.outcome} />
          )}
        </div>
      </div>

      {!isLaptopWorkflow && !isInductionPresenter && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-flow-line bg-white p-4 text-sm shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Summary
            </h2>
            <dl className="space-y-1.5">
              <Row label="Employee" value={task.employeeName || employee?.fullName || "—"} />
              <Row label="Employee ID" value={employee?.employeeNumber || task.employeeId} />
              <Row label="Department" value={task.department || employee?.department || "—"} />
              <Row
                label="Assigned to"
                value={`${task.assignedUserName || task.assignedPersonName} (${task.assignedEmail})`}
              />
              <Row label="Due date" value={formatDate(task.dueDate)} />
              <Row
                label="Dependencies"
                value={unmet.length ? `Waiting: ${unmet.join(", ")}` : "None unmet"}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-flow-line bg-white p-4 text-sm shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Instructions
            </h2>
            <p className="text-slate-700">
              {task.instructions || task.description || "Follow your department SOP for this task."}
            </p>
          </div>
        </div>
      )}

      {isLaptopDecision && laptopRequest && (
        <LaptopDecisionPanel
          task={task}
          employee={employee}
          request={laptopRequest}
          onDone={setMessage}
        />
      )}
      {isLaptopProcurement && laptopRequest && (
        <LaptopProcurementPanel
          task={task}
          employee={employee}
          request={laptopRequest}
          onDone={setMessage}
        />
      )}
      {isLaptopPrepare && laptopRequest && (
        <LaptopPreparePanel
          task={task}
          employee={employee}
          request={laptopRequest}
          onDone={setMessage}
        />
      )}

      {isInductionPresenter && inductionForm && (
        <InductionPresenterPanel
          task={task}
          employee={employee}
          form={inductionForm}
          onDone={setMessage}
        />
      )}
      {isInductionPresenter && !inductionForm && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Linked Induction Checklist form was not found. Ask Admin to run Repair
          Induction Workflow.
        </div>
      )}

      {taskType === "Confirmation" && item && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Exit Clearance confirmation</h2>
          <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Item" value={item.title} />
            <Row label="Employee answer" value={item.employeeAnswer} />
            <Row label="Confirmation needed from" value={item.confirmationDepartment} />
            <Row label="Assigned" value={item.confirmationAssignedEmail} />
            <Row label="Current status" value={item.confirmationStatus} />
            <Row label="Confirmed by" value={item.confirmationName || "—"} />
          </dl>
          {Object.keys(item.conditionalValues || {}).length > 0 && (
            <div className="mb-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              {Object.entries(item.conditionalValues).map(([k, v]) => (
                <p key={k}>
                  <span className="font-semibold">{k}:</span> {v}
                </p>
              ))}
            </div>
          )}
          {item.confidentialRemarks && (
            <p className="mb-3 text-sm text-slate-600">
              Employee remarks: {item.confidentialRemarks}
            </p>
          )}
          {!closed && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border border-flow-line px-3 py-2 text-sm"
                rows={3}
                placeholder="Confirmation remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <input
                className="w-40 rounded-md border border-flow-line px-3 py-2 text-sm"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                placeholder="Initials"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => run("Confirm")}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
                  onClick={() => run("Return for Correction")}
                >
                  Return for Correction
                </button>
              </div>
            </div>
          )}
          {session.role === "Admin" && (
            <div className="mt-4 border-t border-flow-line pt-3">
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 underline"
                onClick={() => setShowOverride((v) => !v)}
              >
                Admin Override Confirmation
              </button>
              {showOverride && (
                <div className="mt-2 space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs text-rose-800">
                    Separate from Confirm — requires override reason and is fully audited.
                  </p>
                  <input
                    className="w-full rounded border border-rose-200 px-2 py-1.5 text-sm"
                    placeholder="Override reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <select
                    className="rounded border border-rose-200 px-2 py-1.5 text-sm"
                    value={overrideOutcome}
                    onChange={(e) =>
                      setOverrideOutcome(
                        e.target.value as "Confirmed" | "Returned for Correction"
                      )
                    }
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Returned for Correction">Returned for Correction</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() => run("Admin Override Confirmation")}
                  >
                    Submit override
                  </button>
                </div>
              )}
            </div>
          )}
          {form && session.role === "Admin" && (
            <Link
              href={`/oneflow/exit-clearance/${form.id}`}
              className="mt-3 inline-block text-xs text-flow-accent underline"
            >
              Open full Exit Clearance Form (Admin)
            </Link>
          )}
        </div>
      )}

      {taskType === "Action" &&
        !isLaptopProcurement &&
        !isLaptopPrepare &&
        !isInductionPresenter && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Action</h2>
          {task.isExitClearanceEmployeeTask && formId && (
            <Link
              href={`/oneflow/exit-clearance/${formId}`}
              className="mb-3 inline-block text-sm font-semibold text-flow-accent underline"
            >
              Open Exit Clearance Form →
            </Link>
          )}
          {task.linkedInductionFormId && (
            <Link
              href={`/oneflow/my-forms/induction/${task.linkedInductionFormId}`}
              className="mb-3 inline-block text-sm font-semibold text-flow-accent underline"
            >
              Open Induction Checklist Form →
            </Link>
          )}
          {task.linkedAccessCardFormId && (
            <Link
              href={`/oneflow/my-forms/access-card/${task.linkedAccessCardFormId}`}
              className="mb-3 inline-block text-sm font-semibold text-flow-accent underline"
            >
              Open Access Card Application →
            </Link>
          )}
          <textarea
            className="mb-3 w-full rounded-md border border-flow-line px-3 py-2 text-sm"
            rows={2}
            placeholder="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={closed}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={closed || unmet.length > 0}
              className="rounded-md border border-flow-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={() => run("Start")}
            >
              Start Task
            </button>
            <button
              type="button"
              disabled={closed || unmet.length > 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => run("Complete")}
            >
              Complete Task
            </button>
          </div>
        </div>
      )}

      {taskType === "Approval" && !isLaptopDecision && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Approval</h2>
          <textarea
            className="mb-3 w-full rounded-md border border-flow-line px-3 py-2 text-sm"
            rows={2}
            placeholder="Approver remarks (required for Reject)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={closed}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={closed}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => run("Approve")}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={closed}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => run("Reject")}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {taskType === "Review" && task.isPersonalInfoReviewTask && employee && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Review Personal Information</h2>
          <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Full name" value={employee.fullName} />
            <Row label="Employee ID" value={employee.employeeNumber} />
            <Row label="Job title" value={employee.role} />
            <Row label="Department" value={employee.department} />
            <Row label="Manager" value={employee.managerName} />
            <Row label="Location" value={employee.location} />
            <Row label="Start date" value={formatDate(employee.startDate)} />
            <Row label="Work email" value={employee.email} />
          </dl>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Preferred name
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
                value={preferredName}
                disabled={closed}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Personal email
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
                value={personalEmail}
                disabled={closed}
                onChange={(e) => setPersonalEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Contact number
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
                value={phone}
                disabled={closed}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Emergency contact name
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
                value={emergencyName}
                disabled={closed}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Emergency contact number
              <input
                className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm font-normal"
                value={emergencyPhone}
                disabled={closed}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={closed}
              className="rounded-md border border-flow-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={() => {
                const result = service.savePersonalInformationDraft(session, task.id, {
                  preferredName,
                  personalEmail,
                  phone,
                  emergencyContactName: emergencyName,
                  emergencyContactNumber: emergencyPhone,
                });
                setMessage(result.ok ? "Changes saved." : result.error);
                if (result.ok) refresh();
              }}
            >
              Save Changes
            </button>
            <button
              type="button"
              disabled={closed}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => {
                const result = service.confirmPersonalInformation(session, task.id, {
                  preferredName,
                  personalEmail,
                  phone,
                  emergencyContactName: emergencyName,
                  emergencyContactNumber: emergencyPhone,
                });
                setMessage(result.ok ? "Information confirmed." : result.error);
                if (result.ok) refresh();
              }}
            >
              Confirm Information
            </button>
          </div>
        </div>
      )}

      {taskType === "Review" && !task.isPersonalInfoReviewTask && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Review</h2>
          {task.linkedInductionFormId && (
            <Link
              href={`/oneflow/my-forms/induction/${task.linkedInductionFormId}`}
              className="mb-3 inline-block text-sm font-semibold text-flow-accent underline"
            >
              Open Induction Checklist Form →
            </Link>
          )}
          {task.linkedAccessCardFormId && (
            <Link
              href={`/oneflow/my-forms/access-card/${task.linkedAccessCardFormId}`}
              className="mb-3 inline-block text-sm font-semibold text-flow-accent underline"
            >
              Open Access Card Application →
            </Link>
          )}
          <textarea
            className="mb-3 w-full rounded-md border border-flow-line px-3 py-2 text-sm"
            rows={2}
            placeholder="Reviewer remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={closed}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={closed}
              className="rounded-md border border-flow-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
              onClick={() => run("Start Review")}
            >
              Start Review
            </button>
            <button
              type="button"
              disabled={closed}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => run("Complete Review")}
            >
              Complete Review
            </button>
            <button
              type="button"
              disabled={closed}
              className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-40"
              onClick={() => run("Return for Correction")}
            >
              Return for Correction
            </button>
          </div>
        </div>
      )}

      {taskType === "Information" && (
        <div className="mb-6 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">
            {task.isFirstDayAckTask
              ? "First-Day Instructions"
              : "Information"}
          </h2>
          {task.isFirstDayAckTask && employee && (
            <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Reporting date" value={formatDate(employee.startDate)} />
              <Row label="Reporting time" value="9:00 AM" />
              <Row label="Office location" value={employee.location} />
              <Row label="Manager" value={employee.managerName} />
              <Row label="Contact person" value="Amanda Lee (HR)" />
              <Row label="Dress code" value="Business casual" />
              <Row
                label="Parking / arrival"
                value="Report to UOA Business Park lobby reception. Bring photo ID for visitor pass."
              />
              <Row
                label="Emergency contact"
                value="HR Operations · hr@ppg-demo.com"
              />
            </dl>
          )}
          {task.isFirstDayAckTask && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500">Items to bring</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                <li>Identity document (NRIC or passport)</li>
                <li>Bank account details for payroll</li>
                <li>Signed offer letter (if not already returned)</li>
              </ul>
            </div>
          )}
          {!task.isFirstDayAckTask && (
            <p className="mb-3 text-sm text-slate-600">
              I acknowledge that I have read and understood this information.
            </p>
          )}
          <button
            type="button"
            disabled={closed}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            onClick={() => {
              if (task.isFirstDayAckTask) {
                const result = service.acknowledgeFirstDayInstructions(
                  session,
                  task.id
                );
                setMessage(
                  result.ok ? "First-day instructions acknowledged." : result.error
                );
                if (result.ok) refresh();
                return;
              }
              run("Acknowledge");
            }}
          >
            Acknowledge
          </button>
        </div>
      )}

      <div className="mb-3 rounded-xl border border-flow-line bg-white shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
          onClick={() => setShowActivity((v) => !v)}
        >
          Activity history
          <span className="text-xs font-normal text-slate-400">
            {showActivity ? "Hide" : "Show"}
          </span>
        </button>
        {showActivity && (
          <ul className="space-y-2 border-t border-flow-line px-4 py-3 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="border-b border-slate-100 pb-2">
                <p className="font-medium text-slate-800">{a.action}</p>
                <p className="text-xs text-slate-500">
                  {a.actor} · {new Date(a.timestamp).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600">{a.detail}</p>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="text-slate-400">No activity yet.</li>
            )}
          </ul>
        )}
      </div>

      <div className="mb-3 rounded-xl border border-flow-line bg-white shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
          onClick={() => setShowRelated((v) => !v)}
        >
          Related records
          <span className="text-xs font-normal text-slate-400">
            {showRelated ? "Hide" : "Show"}
          </span>
        </button>
        {showRelated && (
          <div className="space-y-2 border-t border-flow-line px-4 py-3 text-sm text-slate-600">
            <p>
              Case: {task.onboardingCaseId || task.offboardingCaseId || "—"}
            </p>
            <p>Assignee: {task.assignedEmail}</p>
            {laptopRequest && (
              <p>Laptop request: {laptopRequest.requestStatus}</p>
            )}
            {unmet.length > 0 && (
              <p>Waiting on: {unmet.join(", ")}</p>
            )}
          </div>
        )}
      </div>

      <Link href="/oneflow/my-tasks" className="mt-4 inline-block text-sm text-flow-accent underline">
        ← Back to My Tasks
      </Link>
    </OneFlowShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
