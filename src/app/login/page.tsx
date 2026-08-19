"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/shared/auth-provider";
import { roleLabel } from "@/data/role-labels";
import type { User, UserRole } from "@/data/auth-types";

type GroupName = "Administration" | "People & Management" | "Technology" | "Operations" | "Specialist Functions";
type Filter = "All" | "People" | "Technology" | "Operations" | "Employee Journeys";

const GROUPS: Array<{ label: GroupName; roles: UserRole[]; accent: string; avatar: string; badge: string }> = [
  { label: "Administration", roles: ["Admin"], accent: "border-l-indigo-500", avatar: "border-indigo-200 bg-indigo-50 text-indigo-700", badge: "bg-indigo-50 text-indigo-700" },
  { label: "People & Management", roles: ["HR", "HIRING_MANAGER"], accent: "border-l-violet-500", avatar: "border-violet-200 bg-violet-50 text-violet-700", badge: "bg-violet-50 text-violet-700" },
  { label: "Technology", roles: ["IT_SECURITY", "ONSITE_IT"], accent: "border-l-cyan-500", avatar: "border-cyan-200 bg-cyan-50 text-cyan-700", badge: "bg-cyan-50 text-cyan-700" },
  { label: "Operations", roles: ["FACILITIES", "FINANCE", "CORPORATE_CARD", "ADMINISTRATION"], accent: "border-l-teal-500", avatar: "border-teal-200 bg-teal-50 text-teal-700", badge: "bg-teal-50 text-teal-700" },
  { label: "Specialist Functions", roles: ["QUALITY", "PRODUCT_STEWARDSHIP"], accent: "border-l-amber-500", avatar: "border-amber-200 bg-amber-50 text-amber-700", badge: "bg-amber-50 text-amber-700" },
];

const FILTERS: Array<{ label: Filter; groups?: GroupName[] }> = [
  { label: "All" },
  { label: "People", groups: ["Administration", "People & Management"] },
  { label: "Technology", groups: ["Technology"] },
  { label: "Operations", groups: ["Operations", "Specialist Functions"] },
  { label: "Employee Journeys" },
];

function destination(user: User) {
  if (user.role === "Admin") return "/oneflow";
  if (user.role === "OFFBOARDING_EMPLOYEE") return "/oneflow/my-offboarding";
  if (user.role === "ONBOARDING_EMPLOYEE") return "/oneflow/my-onboarding";
  return "/oneflow";
}

function initials(user: User) {
  return user.initials || user.name.split(/[\s,]+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function journeyCopy(user: User) {
  return user.role === "ONBOARDING_EMPLOYEE"
    ? { status: "Preboarding", copy: "Experience the employee onboarding journey", accent: "border-cyan-200 bg-cyan-50/70", badge: "bg-cyan-100 text-cyan-800", avatar: "border-cyan-200 bg-white text-cyan-700" }
    : { status: "Offboarding", copy: "Experience the employee offboarding journey", accent: "border-violet-200 bg-violet-50/70", badge: "bg-fuchsia-100 text-fuchsia-800", avatar: "border-violet-200 bg-white text-violet-700" };
}

export default function LoginPage() {
  const { login, quickLogin, demoUsers, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/oneflow";
  const [email, setEmail] = useState("admin@ppg-demo.com");
  const [password, setPassword] = useState("Demo123!");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [error, setError] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const matches = (user: User) => !normalizedSearch || [user.name, user.email, roleLabel(user.role)].some((value) => value.toLowerCase().includes(normalizedSearch));
  const journeys = demoUsers.filter((user) => ["ONBOARDING_EMPLOYEE", "OFFBOARDING_EMPLOYEE"].includes(user.role) && matches(user));
  const selectedFilter = FILTERS.find((item) => item.label === filter);
  const groupedUsers = GROUPS
    .filter((group) => !selectedFilter?.groups || selectedFilter.groups.includes(group.label))
    .map((group) => ({ ...group, users: demoUsers.filter((user) => group.roles.includes(user.role) && matches(user)) }))
    .filter((group) => group.users.length);

  const selectAccount = (user: User) => {
    quickLogin(user);
    router.replace(destination(user));
  };

  if (session) {
    return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-flow text-sm text-white"><div className="absolute h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" /><div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-2xl backdrop-blur"><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />Loading OneFlow...</div></div>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 font-flow text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(34,211,238,.24),transparent_24%),radial-gradient(circle_at_90%_20%,rgba(139,92,246,.28),transparent_26%),radial-gradient(circle_at_76%_88%,rgba(244,114,182,.18),transparent_27%),linear-gradient(135deg,#0b1227_0%,#172554_44%,#312e81_100%)]" />
      <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-pink-300/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-5 sm:px-7 lg:grid-cols-[.62fr_1.38fr] lg:items-center lg:px-10 xl:px-12">
        <section className="hidden text-white lg:block lg:pr-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-cyan-200" /> OneFlow Phase 1</div>
          <h1 className="mt-7 text-4xl font-semibold tracking-tight xl:text-5xl">OneFlow</h1>
          <p className="mt-3 text-base font-medium text-cyan-100">Employee Lifecycle Orchestration</p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">A coordinated workspace for onboarding, offboarding and cross-functional Day 1 readiness.</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">{["Role-based task ownership", "Lifecycle readiness visibility", "Employee journey experience"].map((item) => <li key={item} className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-cyan-200" />{item}</li>)}</ul>
        </section>

        <section className="rounded-[20px] border border-white/35 bg-gradient-to-br from-white/[.96] via-white/[.93] to-slate-100/[.92] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl sm:p-6 lg:max-h-[calc(100vh-2.5rem)]">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-flow-accent">OneFlow workspace</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2><p className="mt-1 text-sm text-slate-500">Choose a role to explore OneFlow.</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-flow-accent" />Hackathon Demo · Synthetic Data</span>
          </header>

          <form className="mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); const result = login(email, password); if (!result.ok) return setError(result.error); router.replace(next.startsWith("/oneflow") ? next : "/oneflow"); }}>
            <label className="sr-only" htmlFor="login-email">Email address</label><input id="login-email" placeholder="Email address" className="min-w-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" value={email} onChange={(event) => setEmail(event.target.value)} />
            <label className="sr-only" htmlFor="login-password">Password</label><input id="login-password" type="password" placeholder="Password" className="min-w-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" className="rounded-xl bg-flow-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-700/20 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2">Sign in</button>
          </form>
          {error && <p className="mt-2 text-xs text-rose-700" role="alert">{error}</p>}

          <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or choose a demo account<span className="h-px flex-1 bg-slate-200" /></div>

          <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/85 via-white to-violet-50/80 p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Explore Employee Journeys</h3><p className="mt-1 text-xs text-slate-500">See OneFlow from the employee perspective.</p></div><Sparkles className="h-4 w-4 text-violet-500" /></div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">{journeys.map((user) => { const detail = journeyCopy(user); return <button key={user.id} type="button" onClick={() => selectAccount(user)} className={`group rounded-xl border ${detail.accent} p-3 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2`}><div className="flex gap-2.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${detail.avatar}`}>{initials(user)}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-800">{user.name}</p><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-flow-accent" /></div><p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p><div className="mt-2 flex flex-wrap gap-1"><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${detail.badge}`}>{detail.status}</span><span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{roleLabel(user.role)}</span></div></div></div><p className="mt-2 text-xs text-slate-600">{detail.copy}</p><span className="mt-2 inline-flex items-center text-xs font-semibold text-flow-accent">Explore Journey <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></button>; })}</div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><label className="sr-only" htmlFor="account-search">Search demo accounts</label><input id="account-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or role..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-flow-accent focus:ring-2 focus:ring-flow-accent/20" /></div><div className="flex flex-wrap gap-1.5">{FILTERS.map((item) => <button key={item.label} type="button" onClick={() => setFilter(item.label)} className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-1 ${filter === item.label ? "bg-slate-800 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>

          <div className="mt-3 max-h-[31vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[33vh]">{filter === "Employee Journeys" ? <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-4 py-5 text-center text-sm text-slate-600">Employee journey accounts are highlighted above.</p> : groupedUsers.map((group) => <section key={group.label}><h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</h3><div className="grid gap-2 sm:grid-cols-2">{group.users.map((user) => <button key={user.id} type="button" onClick={() => selectAccount(user)} className={`group flex min-h-[76px] items-center gap-2.5 rounded-xl border border-slate-200 border-l-[3px] ${group.accent} bg-white px-3 py-2.5 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${group.avatar}`}>{initials(user)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{user.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{user.email}</span><span className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${group.badge}`}>{roleLabel(user.role)}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-flow-accent" /></button>)}</div></section>)}{filter !== "Employee Journeys" && !groupedUsers.length && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-sm text-slate-500">No demo accounts match your search.</p>}</div>
          <footer className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500"><span>Demo environment · Synthetic data only</span><Link href="/" className="font-medium underline decoration-slate-300 underline-offset-2 transition hover:text-flow-accent">Back to prototype hub</Link></footer>
        </section>
      </div>
    </main>
  );
}
