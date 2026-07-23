"use client";

import Link from "next/link";
import { PhaseBanner } from "@/components/shared/phase-banner";
import { useAuth } from "@/components/shared/auth-provider";

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

  return (
    <div className="min-h-screen bg-flow-canvas font-flow text-flow-ink">
      <div className="print:hidden">
        <PhaseBanner />
      </div>
      <div className="flex min-h-[calc(100vh-37px)] print:block print:min-h-0">
        <aside className="hidden w-56 shrink-0 flex-col bg-flow-panel text-white lg:flex print:hidden">
          <div className="border-b border-white/10 px-4 py-5">
            <p className="text-lg font-semibold tracking-tight">OneFlow</p>
            <p className="mt-1 text-[11px] text-white/55">Admin dashboard</p>
            {session && (
              <div className="mt-3 rounded-md bg-white/10 px-2 py-2 text-[11px]">
                <p className="font-semibold text-white">{session.name}</p>
                <p className="text-white/60">{session.role}</p>
                <p className="truncate text-white/45">{session.email}</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                {item.label}
              </Link>
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
          <header className="border-b border-flow-line bg-white px-5 py-4 print:hidden">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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
