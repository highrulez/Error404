import Link from "next/link";
import { PhaseBanner } from "@/components/shared/phase-banner";

const NAV = [
  { href: "/workday", label: "Workers" },
  { href: "/workday/employees/new", label: "Create Worker" },
];

export function WorkdayShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-hris-canvas font-hris text-hris-ink">
      <PhaseBanner />
      <div className="flex min-h-[calc(100vh-37px)]">
        <aside className="hidden w-56 shrink-0 flex-col bg-hris-ink text-white md:flex">
          <div className="border-b border-white/10 px-4 py-5">
            <p className="font-display text-lg tracking-tight">PPG Workday</p>
            <p className="mt-1 text-[11px] text-white/60">HRIS mock portal</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-auto border-t border-white/10 pt-3">
              <Link
                href="/"
                className="block rounded-md px-3 py-2 text-xs text-white/55 hover:bg-white/10"
              >
                ← Prototype hub
              </Link>
              <Link
                href="/oneflow"
                className="mt-1 block rounded-md px-3 py-2 text-xs text-hris-accent hover:bg-white/10"
              >
                Open OneFlow →
              </Link>
            </div>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-hris-line bg-white px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl tracking-tight text-hris-ink">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                )}
              </div>
              <div className="flex gap-2 md:hidden">
                <Link
                  href="/workday"
                  className="rounded-md bg-hris-soft px-3 py-1.5 text-xs font-medium text-hris-accentDark"
                >
                  Workers
                </Link>
                <Link
                  href="/oneflow"
                  className="rounded-md bg-hris-ink px-3 py-1.5 text-xs font-medium text-white"
                >
                  OneFlow
                </Link>
              </div>
            </div>
          </header>
          <main className="flex-1 p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
