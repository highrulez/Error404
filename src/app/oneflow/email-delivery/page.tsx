"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OneFlowShell } from "@/components/oneflow/shell";
import { useAuth } from "@/components/shared/auth-provider";
import { useData } from "@/components/shared/data-provider";
import { StatusChip } from "@/components/shared/status";
import { formatDateTime } from "@/lib/utils";

type PublicSettings = {
  mode: string;
  region: string;
  fromEmailConfigured: boolean;
  fromName: string;
  credentialsConfigured: boolean;
  appUrl: string;
  mappings: Array<{
    simulated: string;
    purpose: string;
    mappedMasked: string;
    configured: boolean;
  }>;
};

export default function EmailDeliverySettingsPage() {
  const { session } = useAuth();
  const { store, service, refresh, ready } = useData();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("admin@ppg-demo.com");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/email/settings");
      const data = await res.json();
      if (data.ok) setSettings(data.settings);
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (!session) return null;
  if (session.role !== "Admin") {
    return (
      <OneFlowShell title="Email Delivery">
        <p className="text-sm text-slate-500">Admin only.</p>
      </OneFlowShell>
    );
  }

  const emails = ready
    ? [...store.mockEmails]
        .filter((e) => e.status !== "Deleted")
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .slice(0, 40)
    : [];

  const selected = selectedId
    ? emails.find((e) => e.id === selectedId)
    : undefined;
  const details = selected
    ? service.getEmailDeliveryDetails(session, selected.id)
    : null;

  const runTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toMock: testTo,
          session: {
            email: session.email,
            role: session.role,
            name: session.name,
          },
        }),
      });
      const data = await res.json();
      setMessage(
        data.ok
          ? `Test SES send: ${data.deliveryStatus} · messageId ${data.providerMessageId || "—"} · mapped ${data.mappedRecipientMasked || "—"}`
          : `Test failed: ${data.error || data.failureReason}`
      );
      await loadSettings();
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Test request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OneFlowShell
      title="Email Delivery"
      subtitle="AWS SES configuration, recipient mappings, and delivery audit"
    >
      {message && (
        <div className="mb-3 whitespace-pre-wrap rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link href="/oneflow/settings" className="text-flow-accent underline">
          ← Settings
        </Link>
        <Link href="/oneflow/inbox" className="text-flow-accent underline">
          Mock Inbox
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Delivery mode</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">EMAIL_MODE</dt>
              <dd className="font-semibold">{settings?.mode || "…"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">AWS region</dt>
              <dd>{settings?.region || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">From address</dt>
              <dd>{settings?.fromEmailConfigured ? "Configured" : "Missing"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">From name</dt>
              <dd>{settings?.fromName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Credentials</dt>
              <dd>
                {settings?.credentialsConfigured
                  ? "Present (server-only)"
                  : "Not configured"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">App URL</dt>
              <dd className="truncate text-right text-xs">{settings?.appUrl}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Modes: <strong>mock</strong> (inbox only), <strong>ses</strong>{" "}
            (SES + metadata), <strong>both</strong> (Mock Inbox + SES). Default
            is mock when EMAIL_MODE is unset.
          </p>
        </section>

        <section className="rounded-xl border border-flow-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Send test SES email</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sends to the mapped real address for a @ppg-demo.com identity. No
            arbitrary recipients.
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-slate-500">Simulated recipient</span>
            <select
              className="mt-1 w-full rounded-md border border-flow-line px-3 py-2 text-sm"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            >
              {(settings?.mappings || [{ simulated: "admin@ppg-demo.com" }]).map(
                (m) => (
                  <option key={m.simulated} value={m.simulated}>
                    {m.simulated}
                  </option>
                )
              )}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            className="mt-3 rounded-md bg-flow-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            onClick={() => void runTest()}
          >
            Send Test SES Email
          </button>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Recipient mappings (masked)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Mock addresses stay visible in OneFlow. Real SES destinations are
          configured via EMAIL_RECIPIENT_MAP or EMAIL_MAP_* env vars (for
          example EMAIL_MAP_ADMIN, EMAIL_MAP_ALICIA, EMAIL_MAP_DANIEL). Full
          real addresses are never shown in the browser.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-flow-line text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Mock recipient</th>
                <th className="px-2 py-2">Role / purpose</th>
                <th className="px-2 py-2">Mapped destination (masked)</th>
                <th className="px-2 py-2">Configuration status</th>
              </tr>
            </thead>
            <tbody>
              {(settings?.mappings || []).map((m) => (
                <tr key={m.simulated} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-mono text-xs">{m.simulated}</td>
                  <td className="px-2 py-2 text-xs text-slate-700">
                    {m.purpose || "Workflow recipient"}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{m.mappedMasked}</td>
                  <td className="px-2 py-2">
                    <StatusChip
                      status={m.configured ? "Configured" : "Missing"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-3">
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-40"
          onClick={async () => {
            setBusy(true);
            const r = await service.repairAdministrationEmails(session);
            setMessage(r.ok ? r.message : r.error);
            await loadSettings();
            refresh();
            setBusy(false);
          }}
        >
          Repair administration@ → admin@ (no resend)
        </button>
      </div>

      <section className="mt-4 rounded-xl border border-flow-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Recent notifications</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {emails.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    selectedId === e.id
                      ? "border-flow-accent bg-sky-50"
                      : "border-flow-line hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedId(e.id)}
                >
                  <p className="font-medium text-slate-900">{e.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    To {e.to} · {formatDateTime(e.sentAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <StatusChip status={e.deliveryStatus || "Pending"} />
                    {e.provider && e.provider !== "none" && (
                      <StatusChip status={e.provider} />
                    )}
                  </div>
                </button>
              </li>
            ))}
            {!emails.length && (
              <li className="text-xs text-slate-500">No notifications yet.</li>
            )}
          </ul>

          <div className="rounded-md border border-flow-line bg-slate-50 p-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Delivery details
            </h3>
            {!selected && (
              <p className="mt-2 text-xs text-slate-500">
                Select a notification to view delivery metadata.
              </p>
            )}
            {details?.ok && (
              <dl className="mt-2 space-y-1.5 text-xs">
                {(
                  [
                    ["Subject", details.details.subject],
                    ["Simulated recipient", details.details.simulatedRecipient],
                    ["Mapped (masked)", details.details.mappedRecipientMasked],
                    ["Provider", details.details.provider],
                    ["Mode", details.details.deliveryMode],
                    ["Status", details.details.deliveryStatus],
                    ["SES message ID", details.details.providerMessageId || "—"],
                    ["Sent", details.details.sentAt],
                    ["Failed", details.details.failedAt || "—"],
                    ["Failure reason", details.details.failureReason || "—"],
                    ["Attempts", String(details.details.attemptCount)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
                    <dd className="break-all font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {selected && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={async () => {
                    setBusy(true);
                    const r = await service.retryFailedEmail(session, selected.id);
                    setMessage(r.ok ? r.message : r.error);
                    refresh();
                    setBusy(false);
                  }}
                >
                  Retry Failed Email
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md border border-flow-line bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={async () => {
                    setBusy(true);
                    const r = await service.resendWorkflowEmail(
                      session,
                      selected.id
                    );
                    setMessage(r.ok ? r.message : r.error);
                    refresh();
                    setBusy(false);
                  }}
                >
                  Resend Workflow Email
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </OneFlowShell>
  );
}
