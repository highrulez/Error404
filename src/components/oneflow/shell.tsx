"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Repeat2,
  Settings,
  Users,
} from "lucide-react";
import { PhaseBanner } from "@/components/shared/phase-banner";
import { useAuth } from "@/components/shared/auth-provider";
import { roleLabel } from "@/data/role-labels";

function MobileAccountMenu() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!session) return null;

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const handleLogout = () => {
    setOpen(false);
    logout();
    router.replace("/login");
  };
  const handleSwitchAccount = () => {
    setOpen(false);
    logout();
    router.replace("/login");
  };

  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-flow-accent focus:ring-offset-2"
      >
        <CircleUserRound className="h-5 w-5 text-flow-accent" aria-hidden />
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account navigation"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{session.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">{roleLabel(session.role)}</p>
          </div>
          <div className="pt-1">
            <button type="button" role="menuitem" onClick={() => navigate("/")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-flow-accent">
              <Home className="h-4 w-4 text-slate-500" aria-hidden /> Back to OneFlow
            </button>
            <button type="button" role="menuitem" onClick={handleSwitchAccount} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-flow-accent">
              <Repeat2 className="h-4 w-4 text-slate-500" aria-hidden /> Switch Demo Account
            </button>
            <button type="button" role="menuitem" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-flow-accent">
              <LogOut className="h-4 w-4" aria-hidden /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const displaySubtitle =
    session &&
    (session.role === "ONBOARDING_EMPLOYEE" ||
      session.role === "OFFBOARDING_EMPLOYEE") &&
    subtitle?.includes("SES")
      ? "Your OneFlow messages and lifecycle notifications"
      : subtitle;
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
                {displaySubtitle && (
                  <p className="mt-1 text-sm text-slate-500">{displaySubtitle}</p>
                )}
                {session && (
                  <p className="mt-1 text-xs font-medium text-flow-accent">
                    Viewing as: {session.name} — {roleLabel(session.role)}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-2 lg:hidden">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
                {navItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 rounded-md bg-flow-accentSoft px-3 py-1.5 text-xs font-medium text-flow-accent"
                  >
                    {item.label}
                  </Link>
                ))}
                </div>
                <MobileAccountMenu />
              </div>
            </div>
          </header>
          <main className="flex-1 p-5 print:p-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
