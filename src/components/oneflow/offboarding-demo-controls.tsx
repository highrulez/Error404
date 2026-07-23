"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/shared/data-provider";
import { useAuth } from "@/components/shared/auth-provider";
import {
  DANIEL_EXIT_FORM_ID,
  DANIEL_OFFBOARDING_CASE_ID,
  DEMO_USERS,
} from "@/data";

export function OffboardingDemoControls({
  caseId,
  onDone,
}: {
  caseId?: string;
  onDone?: (message: string) => void;
}) {
  const { session, quickLogin } = useAuth();
  const { service, refresh, store } = useData();
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState(caseId ?? "");
  const [busy, setBusy] = useState(false);

  if (!session || session.role !== "Admin") return null;

  const cases = store.offboardingCases.filter(
    (c) => c.status !== "Completed" && c.status !== "Cancelled"
  );
  const activeCaseId =
    caseId ?? (selectedCaseId || DANIEL_OFFBOARDING_CASE_ID);
  const exitForm =
    service.getExitClearanceFormByCase(activeCaseId) ||
    service.getExitClearanceForm(DANIEL_EXIT_FORM_ID);

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
        Demo-only shortcuts. Mutates local prototype data only — not production.
      </p>

      {!caseId && (
        <label className="mt-3 block text-xs font-semibold text-amber-900">
          Target case
          <select
            className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
          >
            <option value="">Select offboarding case…</option>
            {cases.map((c) => {
              const emp = store.employees.find((e) => e.id === c.employeeId);
              return (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} · {emp?.fullName ?? "Employee"}
                </option>
              );
            })}
          </select>
        </label>
      )}

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-amber-900">
        Exit Clearance Form (Daniel)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Daniel exit journey reset", () => {
              const r = service.resetDanielExitFormJourney(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Reset Daniel Exit Form Journey
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Initial exit email sent", () => {
              if (!exitForm) throw new Error("No exit form.");
              const r = service.adminSendExitFormEmail(session, exitForm.id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Send Initial Exit Form Email
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Switched to Daniel", () => {
              loginAs(
                "daniel.lim@ppg-demo.com",
                exitForm
                  ? `/oneflow/exit-clearance/${exitForm.id}`
                  : "/oneflow/exit-clearance"
              );
            })
          }
        >
          Login as Daniel
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() => {
            if (!exitForm) return;
            router.push(`/oneflow/exit-clearance/${exitForm.id}`);
          }}
        >
          Open Exit Form
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Sample answers populated", () => {
              if (!exitForm) throw new Error("No exit form.");
              const r = service.populateSampleExitAnswers(session, exitForm.id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Sample Answers
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Form submitted as Daniel (admin)", () => {
              if (!exitForm) throw new Error("No exit form.");
              service.populateSampleExitAnswers(session, exitForm.id);
              const form = service.getExitClearanceForm(exitForm.id)!;
              const r = service.submitExitClearanceForm(session, form.id, {
                personalEmail: form.personalEmail,
                contactNumber: form.contactNumber,
                employeeDeclarationConfirmed: true,
                employeeTypedSignature: "Daniel Lim",
                checklistItems: form.checklistItems.map((i) => ({
                  id: i.id,
                  employeeAnswer: i.employeeAnswer,
                  conditionalValues: i.conditionalValues,
                })),
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Submit Form as Daniel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Switched to Hiring Manager", () =>
              loginAs("manager@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Hiring Manager
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Manager items confirmed", () => {
              if (!exitForm) throw new Error("No exit form.");
              const form = service.getExitClearanceForm(exitForm.id)!;
              for (const item of form.checklistItems) {
                if (item.confirmationDepartment !== "Direct Line Manager")
                  continue;
                if (item.confirmationStatus === "Confirmed") continue;
                if (item.confirmationStatus === "Not Required") continue;
                service.confirmExitClearanceItem(session, {
                  formId: form.id,
                  itemId: item.id,
                  action: "Confirm",
                  name: "Sarah Tan",
                  initial: "ST",
                  remarks: "Demo confirm",
                });
              }
            })
          }
        >
          Confirm Manager Items
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Switched to Finance", () =>
              loginAs("finance@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Finance
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Finance item confirmed", () => {
              if (!exitForm) throw new Error("No exit form.");
              const form = service.getExitClearanceForm(exitForm.id)!;
              const item = form.checklistItems.find(
                (i) => i.confirmationDepartment === "Finance / Concur Team"
              );
              if (!item || item.confirmationStatus === "Not Required") return;
              service.confirmExitClearanceItem(session, {
                formId: form.id,
                itemId: item.id,
                action: "Confirm",
                name: "Finance Admin",
                initial: "FA",
              });
            })
          }
        >
          Confirm Finance Item
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Switched to Corporate Card", () =>
              loginAs("corporatecard@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Corporate Card Admin
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Corporate card confirmed", () => {
              if (!exitForm) throw new Error("No exit form.");
              const form = service.getExitClearanceForm(exitForm.id)!;
              const item = form.checklistItems.find(
                (i) =>
                  i.confirmationDepartment === "APAC Corporate Card Admin"
              );
              if (!item || item.confirmationStatus === "Not Required") return;
              service.confirmExitClearanceItem(session, {
                formId: form.id,
                itemId: item.id,
                action: "Confirm",
                name: "Corporate Card Admin",
                initial: "CC",
              });
            })
          }
        >
          Confirm Corporate Card Item
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Switched to Administration", () =>
              loginAs("administration@ppg-demo.com", "/oneflow/my-tasks")
            )
          }
        >
          Login as Administration
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Administration items confirmed", () => {
              if (!exitForm) throw new Error("No exit form.");
              const form = service.getExitClearanceForm(exitForm.id)!;
              for (const item of form.checklistItems) {
                if (item.confirmationDepartment !== "Administration") continue;
                if (item.confirmationStatus === "Not Required") continue;
                if (item.confirmationStatus === "Confirmed") continue;
                service.confirmExitClearanceItem(session, {
                  formId: form.id,
                  itemId: item.id,
                  action: "Confirm",
                  name: "Administration",
                  initial: "AD",
                });
              }
            })
          }
        >
          Confirm Administration Items
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("All confirmations completed", () => {
              if (!exitForm) throw new Error("No exit form.");
              const r = service.confirmAllExitConfirmations(
                session,
                exitForm.id
              );
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Complete All Confirmations
        </button>
        <button
          type="button"
          disabled={busy || !exitForm}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Missing confirmation simulated", () => {
              if (!exitForm) throw new Error("No exit form.");
              const form = service.getExitClearanceForm(exitForm.id)!;
              const item = form.checklistItems.find(
                (i) =>
                  i.confirmationStatus === "Pending" ||
                  i.confirmationStatus === "In Progress"
              );
              if (!item) throw new Error("No pending confirmation to leave open.");
              onDone?.(
                `Left open: ${item.title} (${item.confirmationDepartment})`
              );
            })
          }
        >
          Simulate Missing Confirmation
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Reminder check", () => {
              const r = service.runReminderCheck(session);
              if (!r.ok) throw new Error(r.error);
              onDone?.(r.message);
            })
          }
        >
          Run Reminder Check
        </button>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-amber-900">
        Form workflows (Induction / Access Card) — Presentation Demo Controls
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Induction assigned to Daniel", () => {
              const r = service.assignInductionToDaniel(session);
              if (!r.ok) throw new Error(r.error);
              onDone?.(`Induction form ${r.form.id}`);
            })
          }
        >
          Assign Induction Checklist to Daniel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Induction email", () => {
              const r = service.assignInductionToDaniel(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Send Induction Form Email
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Populate induction", () => {
              const forms = service.listMyForms(session).filter(
                (f) => f.kind === "Induction Checklist"
              );
              const id = forms[0]?.id;
              if (!id) throw new Error("Assign induction first.");
              const r = service.populateInductionDemo(session, id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Induction Demo Data
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() => {
            const forms = service.listMyForms(session).filter(
              (f) => f.kind === "Induction Checklist"
            );
            const id = forms[0]?.id;
            if (!id) {
              onDone?.("Assign induction first.");
              return;
            }
            loginAs("daniel.lim@ppg-demo.com", `/oneflow/my-forms/induction/${id}`);
          }}
        >
          Submit Induction Form as Daniel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() => {
            const forms = service.listMyForms(session).filter(
              (f) => f.kind === "Induction Checklist"
            );
            const id = forms[0]?.id;
            if (!id) {
              onDone?.("Assign induction first.");
              return;
            }
            loginAs("hr@ppg-demo.com", `/oneflow/my-forms/induction/${id}`);
          }}
        >
          Review Induction Form as HR
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Access card assigned", () => {
              const r = service.assignAccessCardToDaniel(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Assign Access Card Application to Daniel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Access card email", () => {
              const r = service.assignAccessCardToDaniel(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Send Access Card Form Email
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Populate access card", () => {
              const forms = service.listMyForms(session).filter(
                (f) => f.kind === "Access Card Application"
              );
              const id = forms[0]?.id;
              if (!id) throw new Error("Assign access card first.");
              const r = service.populateAccessCardDemo(session, id);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Populate Access Card Demo Data
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() => {
            const forms = service.listMyForms(session).filter(
              (f) => f.kind === "Access Card Application"
            );
            const id = forms[0]?.id;
            if (!id) {
              onDone?.("Assign access card first.");
              return;
            }
            loginAs(
              "daniel.lim@ppg-demo.com",
              `/oneflow/my-forms/access-card/${id}`
            );
          }}
        >
          Submit Access Card Form as Daniel
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() => {
            const forms = service.listMyForms(session).filter(
              (f) => f.kind === "Access Card Application"
            );
            const id = forms[0]?.id;
            if (!id) {
              onDone?.("Assign access card first.");
              return;
            }
            loginAs(
              "administration@ppg-demo.com",
              `/oneflow/my-forms/access-card/${id}`
            );
          }}
        >
          Review Access Card Form as Administration
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          onClick={() =>
            run("Mark card issued", () => {
              const forms = service.listMyForms(session).filter(
                (f) => f.kind === "Access Card Application"
              );
              const id = forms[0]?.id;
              if (!id) throw new Error("Assign access card first.");
              const r = service.reviewAccessCardForm(session, id, {
                action: "Mark Card Issued",
                officeUseOnly: {
                  cardNumber: "UOA-DEMO-1001",
                  pin: "1234",
                  activationDate: new Date().toISOString().slice(0, 10),
                  expiryDate: "2028-12-31",
                  receiptNumber: "RCP-9001",
                  administrationRemarks: "Demo issued",
                },
              });
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Mark Demo Access Card Issued
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 disabled:opacity-50"
          onClick={() =>
            run("Form demos reset", () => {
              const r = service.resetFormDemoJourneys(session);
              if (!r.ok) throw new Error(r.error);
            })
          }
        >
          Reset Form Demo Journeys
        </button>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-amber-900">
        Legacy offboarding demos
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-md bg-flow-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          onClick={() =>
            run("Sample case created", () => {
              service.createSampleOffboardingCase();
            })
          }
        >
          Create sample case
        </button>
        {[
          {
            label: "Advance to last day",
            fn: () => {
              if (!activeCaseId) throw new Error("Select a case first.");
              service.advanceToLastWorkingDay(activeCaseId);
            },
          },
          {
            label: "Simulate asset return",
            fn: () => {
              if (!activeCaseId) throw new Error("Select a case first.");
              service.simulateAssetReturn(activeCaseId);
            },
          },
          {
            label: "Simulate access removal",
            fn: () => {
              if (!activeCaseId) throw new Error("Select a case first.");
              service.simulateAccessRemoval(activeCaseId);
            },
          },
          {
            label: "Complete offboarding",
            fn: () => {
              if (!activeCaseId) throw new Error("Select a case first.");
              service.completeOffboarding(activeCaseId);
            },
          },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            disabled={busy}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => run(b.label, b.fn)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
