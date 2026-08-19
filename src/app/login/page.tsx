"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/components/shared/auth-provider";
import { roleLabel } from "@/data/role-labels";
import type { User } from "@/data/auth-types";

const GROUPS = [
  ["Administration", ["Admin"]],
  ["People & Management", ["HR", "HIRING_MANAGER"]],
  ["Technology", ["IT_SECURITY", "ONSITE_IT"]],
  ["Operations", ["FACILITIES", "FINANCE", "CORPORATE_CARD", "ADMINISTRATION"]],
  ["Specialist Functions", ["QUALITY", "PRODUCT_STEWARDSHIP"]],
  ["Employee Journeys", ["ONBOARDING_EMPLOYEE", "OFFBOARDING_EMPLOYEE"]],
] as const;

function destination(user: User) {
  if (user.role === "Admin") return "/oneflow";
  if (user.role === "OFFBOARDING_EMPLOYEE") return "/oneflow/my-offboarding";
  if (user.role === "ONBOARDING_EMPLOYEE") return "/oneflow/my-onboarding";
  return "/oneflow/my-tasks";
}

export default function LoginPage() {
  const { login, quickLogin, demoUsers, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/oneflow";
  const [email, setEmail] = useState("admin@ppg-demo.com");
  const [password, setPassword] = useState("Demo123!");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const matches = (user: User) => !normalizedSearch || [user.name, user.email, roleLabel(user.role)].some((value) => value.toLowerCase().includes(normalizedSearch));
  const groupedUsers = GROUPS.map(([label, roles]) => ({ label, users: demoUsers.filter((user) => roles.includes(user.role as never) && matches(user)) })).filter((group) => group.users.length);

  const selectAccount = (user: User) => {
    quickLogin(user);
    router.replace(destination(user));
  };

  if (session) return <div className="flex min-h-screen items-center justify-center bg-slate-950 font-flow text-sm text-white">Loading OneFlow…</div>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 font-flow text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(56,189,248,.35),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(139,92,246,.34),transparent_30%),radial-gradient(circle_at_72%_82%,rgba(244,114,182,.18),transparent_30%),linear-gradient(135deg,#0f172a_0%,#172554_45%,#312e81_100%)]" />
      <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-80 w-80 rounded-full bg-fuchsia-300/15 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-12">
        <section className="pt-5 text-white lg:pr-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> OneFlow Phase 1 Demo</div>
          <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">OneFlow</h1>
          <p className="mt-3 text-lg font-medium text-cyan-100">Employee Lifecycle Orchestration</p>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Coordinate onboarding, offboarding and cross-functional employee readiness from one place.</p>
          <ul className="mt-8 hidden space-y-3 text-sm text-slate-200 sm:block">{["Role-based task ownership", "Day 1 readiness visibility", "Employee lifecycle coordination"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" />{item}</li>)}</ul>
        </section>

        <section className="rounded-3xl border border-white/35 bg-white/90 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-tight">Welcome to OneFlow</h2><p className="mt-1 text-sm text-slate-500">Choose a demo account to explore the platform.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">Hackathon Demo Environment</span></div>
          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); const result = login(email, password); if (!result.ok) return setError(result.error); router.replace(next.startsWith("/oneflow") ? next : "/oneflow"); }}>
            <label className="sr-only" htmlFor="login-email">Email</label><input id="login-email" className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label className="sr-only" htmlFor="login-password">Password</label><input id="login-password" type="password" className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" className="rounded-xl bg-flow-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2">Sign in</button>
          </form>
          {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

          <div className="relative mt-6"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><label className="sr-only" htmlFor="account-search">Search demo accounts</label><input id="account-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search demo accounts..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" /></div>
          <div className="mt-5 max-h-[58vh] space-y-5 overflow-y-auto pr-1">
            {groupedUsers.map((group) => <section key={group.label}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.label}</h3><div className="grid gap-2 sm:grid-cols-2">{group.users.map((user) => { const journey = user.role === "ONBOARDING_EMPLOYEE" ? "Preboarding" : user.role === "OFFBOARDING_EMPLOYEE" ? "Offboarding" : null; return <button key={user.id} type="button" onClick={() => selectAccount(user)} className="group min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{user.name}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{roleLabel(user.role)}</span>{journey && <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${journey === "Preboarding" ? "bg-cyan-50 text-cyan-700" : "bg-violet-50 text-violet-700"}`}>{journey}</span>}</div></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-flow-accent transition group-hover:translate-x-0.5" /></div></button>; })}</div></section>)}
            {!groupedUsers.length && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No demo accounts match your search.</p>}
          </div>
          <footer className="mt-5 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500"><span>Demo environment · Synthetic data only</span><Link href="/" className="underline hover:text-flow-accent">Back to prototype hub</Link></footer>
        </section>
      </div>
    </main>
  );
}
