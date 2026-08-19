"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FileText, Home, Settings, Users } from "lucide-react";
import { PhaseBanner } from "@/components/shared/phase-banner";
import { useAuth } from "@/components/shared/auth-provider";
import { roleLabel } from "@/data/role-labels";

export function OneFlowShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { session, navItems, logout } = useAuth();
  const pathname = usePathname();
  const navIcon = (label: string) => {
    if (label.includes("Dashboard") || label.includes("Overview")) return Home;
    if (label.includes("Employee")) return Users;
    if (label.includes("Case")) return ClipboardList;
    if (label.includes("Report")) return BarChart3;
    if (label.includes("Setting")) return Settings;
    return FileText;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-flow text-flow-ink">
      <div className="print:hidden">
        <PhaseBanner />
      </div>
      <div className="flex min-h-[calc(100vh-37px)] print:block print:min-h-0">
        <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white lg:flex print:hidden">
          <div className="border-b border-white/10 px-5 py-6">
            <p className="text-lg font-semibold tracking-tight">OneFlow</p>
            <p className="mt-1 text-[11px] tracking-wide text-cyan-100/70">Employee lifecycle orchestration</p>
            {session && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-[11px] shadow-sm">
                <p className="font-semibold text-white">{session.name}</p>
                <p className="text-white/60">{roleLabel(session.role)}</p>
                <p className="truncate text-white/45">{session.email}</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-1.5 p-3">
            {navItems.map((item) => (
              (() => { const Icon = navIcon(item.label); const active = pathname === item.href; return <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white/15 font-semibold text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>; })()
            ))}
            <div className="mt-auto border-t border-white/10 pt-3 space-y-1">
              {session?.role === "Admin" && (
                <Link
                  href="/workday"
                  className="block rounded-md px-3 py-2 text-xs text-sky-300 hover:bg-white/10"
                >
                  Open Workday →
                </Link>
              )}
              <Link
                href="/"
                className="block rounded-md px-3 py-2 text-xs text-white/55 hover:bg-white/10"
              >
                ← Prototype hub
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
                className="w-full rounded-md px-3 py-2 text-left text-xs text-rose-200 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200/80 bg-white/85 px-5 py-5 backdrop-blur print:hidden">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                )}
                {session && (
                  <p className="mt-1 text-xs font-medium text-flow-accent">
                    Viewing as: {session.name} — {roleLabel(session.role)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
                {navItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md bg-flow-accentSoft px-3 py-1.5 text-xs font-medium text-flow-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>
          <main className="flex-1 p-5 print:p-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
