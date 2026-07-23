"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import {
  ALICIA_ACCESS_CARD_FORM_ID,
  ALICIA_EMAIL,
  ALICIA_INDUCTION_FORM_ID,
  ALICIA_ONBOARDING_CASE_ID,
} from "@/data/alicia-types";
import { DEMO_USERS } from "@/data";

export function OnboardingDemoControls({
  caseId,
  onDone,
}: {
  caseId?: string;
  onDone?: (message: string) => void;
}) {
  const { session, quickLogin } = useAuth();
  const { service, refresh, store } = useData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!session || session.role !== "Admin") return null;
  if (caseId && caseId !== ALICIA_ONBOARDING_CASE_ID) return null;

  const induction =
    service.getInductionForm(ALICIA_INDUCTION_FORM_ID) ||
    store.inductionForms.find((f) => f.employeeId === "emp-alicia-wong");
  const access =
    service.getAccessCardForm(ALICIA_ACCESS_CARD_FORM_ID) ||
    store.accessCardForms.find((f) => f.employeeId === "emp-alicia-wong");
  const personalTask = store.tasks.find(
    (t) => t.isPersonalInfoReviewTask && t.employeeId === "emp-alicia-wong"
  );
  const firstDayTask = store.tasks.find(
    (t) => t.isFirstDayAckTask && t.employeeId === "emp-alicia-wong"
  );

  const run = (label: string, fn: () => void) => {
    setBusy(true);
    try {
      fn();
      refresh();
      onDone?.(`${label} completed.`);
    } catch (err) {
      onDone?.(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const loginAs = (email: string, next?: string) => {
    const user = DEMO_USERS.find((u) => u.email === email);
    if (!user) throw new Error(`Demo user not found: ${email}`);
    quickLogin(user);
    if (next) router.push(next);
  };

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-4">
      <p className="text-sm font-semibold text-amber-900">
        Presentation Demo Controls
      </p>
      <p className="mt-1 text-xs text-amber-800/80">
        Alicia Wong onboarding shortcuts. Mutates local prototype data only.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn
          busy={busy}
          onClick={() => {
            setBusy(true);
            try {
              const r = service.repairAliciaOnboardingJourney(session);
              if (!r.ok) throw new Error(r.error);
              refresh();
              onDone?.(r.message);
            } catch (err) {
              onDone?.(err instanceof Error ? err.message : "Repair failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Repair Alicia Onboarding Journey
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Repair Alicia Onboarding Forms", () => {
              const r = service.repairAliciaOnboardingForms(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Repair Alicia Onboarding Forms
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Reset Alicia Onboarding Journey", () => {
              const r = service.resetAliciaOnboardingJourney(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Reset Alicia Onboarding Journey
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Send Welcome Email", () => {
              const r = service.sendAliciaWelcomeEmail(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Send Welcome Email
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Login as Alicia", () =>
              loginAs(ALICIA_EMAIL, `/oneflow/my-onboarding/${ALICIA_ONBOARDING_CASE_ID}`)
            )
          }
        >
          Login as Alicia
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Populate Completed Induction Sessions", () => {
              if (!induction) throw new Error("No induction form");
              const r = service.populateAllInductionSessionsDemo(
                session,
                induction.id
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
          disabled={!induction}
        >
          Populate Demo Completed Sessions
        </Btn>
        <Btn
          busy={busy}
          onClick={() => {
            setBusy(true);
            try {
              const r = service.repairAliciaInductionWorkflow(session);
              if (!r.ok) throw new Error(r.error);
              refresh();
              onDone?.(r.message);
            } catch (err) {
              onDone?.(err instanceof Error ? err.message : "Repair failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Repair Induction Workflow
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Reset Alicia Induction Journey", () => {
              const r = service.resetAliciaInductionJourney(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Reset Alicia Induction Journey
        </Btn>
        <Btn
          busy={busy}
          disabled={!induction}
          onClick={() =>
            run("Populate Completed Induction Sessions (legacy)", () => {
              if (!induction) throw new Error("No induction form");
              const r = service.populateInductionDemo(session, induction.id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Completed Induction Sessions
        </Btn>
        <Btn
          busy={busy}
          disabled={!induction}
          onClick={() =>
            run("Submit Induction Form as Alicia", () => {
              if (!induction) throw new Error("No induction form");
              service.populateInductionDemo(session, induction.id);
              const r = service.submitInductionForm(session, induction.id, {
                employeeDeclaration: true,
                typedSignature: "Alicia Wong",
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Submit Induction Form as Alicia
        </Btn>
        <Btn
          busy={busy}
          disabled={!access}
          onClick={() =>
            run("Populate Access Card Demo Data", () => {
              if (!access) throw new Error("No access card form");
              const r = service.populateAccessCardDemo(session, access.id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Access Card Demo Data
        </Btn>
        <Btn
          busy={busy}
          disabled={!access}
          onClick={() =>
            run("Submit Access Card Form as Alicia", () => {
              if (!access) throw new Error("No access card form");
              service.populateAccessCardDemo(session, access.id);
              const r = service.submitAccessCardForm(session, access.id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Submit Access Card Form as Alicia
        </Btn>
        <Btn
          busy={busy}
          disabled={!personalTask}
          onClick={() =>
            run("Confirm Personal Information", () => {
              if (!personalTask) throw new Error("No personal info task");
              const r = service.confirmPersonalInformation(
                session,
                personalTask.id,
                {}
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Confirm Personal Information
        </Btn>
        <Btn
          busy={busy}
          disabled={!firstDayTask}
          onClick={() =>
            run("Acknowledge First-Day Instructions", () => {
              if (!firstDayTask) throw new Error("No first-day task");
              const r = service.acknowledgeFirstDayInstructions(
                session,
                firstDayTask.id
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Acknowledge First-Day Instructions
        </Btn>
        <Btn
          busy={busy}
          disabled={!induction}
          onClick={() =>
            run("Review Induction as HR", () => {
              if (!induction) throw new Error("No induction form");
              const r = service.reviewInductionForm(session, induction.id, {
                action: "Complete Review",
                remarks: "Demo HR review approved",
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Review Induction as HR
        </Btn>
        <Btn
          busy={busy}
          disabled={!access}
          onClick={() =>
            run("Review Access Card as Administration", () => {
              if (!access) throw new Error("No access card form");
              const r = service.reviewAccessCardForm(session, access.id, {
                action: "Approve",
                remarks: "Demo Administration review approved",
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Review Access Card as Administration
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Mark Internal Tasks Complete", () => {
              const r = service.markAliciaInternalTasksComplete(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Mark Internal Tasks Complete
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Mark Ready for Day One", () => {
              const r = service.forceAliciaReadyForDayOne(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Mark Ready for Day One
        </Btn>
      </div>

      <p className="mt-4 text-xs font-semibold text-amber-900">
        Laptop Requirement &amp; Purchase Order
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn
          busy={busy}
          onClick={() =>
            run("Reset Alicia Laptop Request", () => {
              const r = service.resetDemoLaptopRequest(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Reset Alicia Laptop Request
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Send Laptop Decision Email", () => {
              const r = service.sendLaptopDecisionEmail(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Send Laptop Decision Email
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Login as Sarah Tan", () =>
              loginAs(
                "manager@ppg-demo.com",
                "/oneflow/my-tasks"
              )
            )
          }
        >
          Login as Sarah Tan
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Select Laptop Not Required", () => {
              service.resetDemoLaptopRequest(session);
              const req = service.getLaptopRequestByCase(ALICIA_ONBOARDING_CASE_ID);
              if (!req) throw new Error("No laptop request");
              const r = service.submitLaptopNotRequired(session, req.id, {
                reason: "Existing laptop will be reassigned",
                remarks: "Demo: no laptop required",
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Select Laptop Not Required
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Submit Demo Laptop Request", () => {
              service.resetDemoLaptopRequest(session);
              const r = service.submitDemoLaptopRequest(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Submit Demo Laptop Request
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Login as Admin", () =>
              loginAs("admin@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Admin
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Populate Demo PO", () => {
              const r = service.populateDemoLaptopPO(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Demo PO
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Confirm PO Created", () => {
              const r = service.confirmDemoLaptopPO(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Confirm PO Created
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Login as Onsite IT", () =>
              loginAs("itsupport@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Onsite IT
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Mark Laptop Received", () => {
              const req = service.getLaptopRequestByCase(ALICIA_ONBOARDING_CASE_ID);
              if (!req) throw new Error("No laptop request");
              const r = service.updateLaptopEquipmentStatus(
                session,
                req.id,
                "Device Received"
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Mark Laptop Received
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Mark Laptop Ready", () => {
              const req = service.getLaptopRequestByCase(ALICIA_ONBOARDING_CASE_ID);
              if (!req) throw new Error("No laptop request");
              const r = service.updateLaptopEquipmentStatus(
                session,
                req.id,
                "Ready for Collection"
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Mark Laptop Ready
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Simulate Missing Credit Number", () => {
              const r = service.simulateMissingLaptopCredit(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Simulate Missing Credit Number
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Simulate Manager Delay", () => {
              const r = service.simulateLaptopManagerDelay(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Simulate Manager Delay
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Advance Demo Time", () => {
              const r = service.advanceDemoLaptopTime(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Advance Demo Time
        </Btn>
        <Btn
          busy={busy}
          onClick={() =>
            run("Run Reminder Check", () => {
              const r = service.runReminderCheck(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Run Reminder Check
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  busy,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
