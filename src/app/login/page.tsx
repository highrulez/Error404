"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PhaseBanner } from "@/components/shared/phase-banner";
import { useAuth } from "@/components/shared/auth-provider";

export default function LoginPage() {
  const { login, quickLogin, demoUsers, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/oneflow";
  const [email, setEmail] = useState("admin@ppg-demo.com");
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm">
        Already signed in. Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-flow">
      <PhaseBanner />
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">OneFlow sign in</h1>
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Prototype authentication — demonstration accounts only.
          </p>

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const result = login(email, password);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.replace(next.startsWith("/oneflow") ? next : "/oneflow");
            }}
          >
            <label className="block text-xs font-semibold text-slate-600">
              Email
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Password
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-flow-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Sign in
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Demo account quick login</h2>
          <div className="mt-3 grid gap-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  quickLogin(u);
                  router.replace(
                    u.role === "Admin"
                      ? "/oneflow"
                      : u.role === "OFFBOARDING_EMPLOYEE"
                        ? "/oneflow/my-offboarding"
                        : u.role === "ONBOARDING_EMPLOYEE"
                          ? "/oneflow/my-onboarding"
                          : "/oneflow/my-tasks"
                  );
                }}
              >
                <span>
                  <span className="font-semibold">{u.name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {u.email} ·{" "}
                    {u.role === "ONBOARDING_EMPLOYEE"
                      ? "Onboarding Employee"
                      : u.role === "OFFBOARDING_EMPLOYEE"
                        ? "Offboarding Employee"
                        : u.role}
                  </span>
                  {(u.role === "ONBOARDING_EMPLOYEE" ||
                    u.role === "OFFBOARDING_EMPLOYEE") && (
                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      Password: Demo123!
                    </span>
                  )}
                </span>
                <span className="text-xs text-flow-accent">Use</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          <Link href="/" className="underline">
            Back to prototype hub
          </Link>
        </p>
      </div>
    </div>
  );
}
