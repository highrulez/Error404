"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/shared/auth-provider";

const PUBLIC_PATHS = ["/", "/login"];

const EMPLOYEE_BLOCKED_PREFIXES = [
  "/oneflow/lifecycle-cases",
  "/oneflow/employees",
  "/oneflow/settings",
  "/oneflow/reports",
  "/oneflow/checklist-templates",
  "/oneflow/exit-clearance-templates",
  "/oneflow/automation-runs",
  "/oneflow/new-hires",
  "/oneflow/offboarding/cases",
  "/oneflow/offboarding/assets",
  "/oneflow/offboarding/access-removal",
  "/oneflow/offboarding/upcoming",
  "/oneflow/cases",
];

function homeForRole(role: string): string {
  if (role === "Admin") return "/oneflow";
  if (role === "OFFBOARDING_EMPLOYEE") return "/oneflow/my-offboarding";
  if (role === "ONBOARDING_EMPLOYEE") return "/oneflow/my-onboarding";
  return "/oneflow/my-tasks";
}

function isEmployeeRole(role: string | undefined): boolean {
  return role === "OFFBOARDING_EMPLOYEE" || role === "ONBOARDING_EMPLOYEE";
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/workday");

  useEffect(() => {
    if (!ready) return;
    if (!session && pathname.startsWith("/oneflow")) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (session && pathname === "/login") {
      router.replace(homeForRole(session.role));
      return;
    }
    if (isEmployeeRole(session?.role)) {
      const home = homeForRole(session!.role);
      if (pathname === "/oneflow") {
        router.replace(home);
        return;
      }
      // Allow own Admin case URL through so the page can redirect safely
      const isOwnAdminCaseRedirect =
        (session!.role === "OFFBOARDING_EMPLOYEE" &&
          pathname.startsWith("/oneflow/offboarding/cases/")) ||
        (session!.role === "ONBOARDING_EMPLOYEE" &&
          pathname.startsWith("/oneflow/cases/"));
      if (
        !isOwnAdminCaseRedirect &&
        EMPLOYEE_BLOCKED_PREFIXES.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`)
        )
      ) {
        router.replace(home);
      }
    }
  }, [ready, session, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!session && pathname.startsWith("/oneflow")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting to login…
      </div>
    );
  }

  const ownAdminCasePassthrough =
    (session?.role === "OFFBOARDING_EMPLOYEE" &&
      pathname.startsWith("/oneflow/offboarding/cases/")) ||
    (session?.role === "ONBOARDING_EMPLOYEE" &&
      pathname.startsWith("/oneflow/cases/"));

  if (
    isEmployeeRole(session?.role) &&
    pathname !== "/oneflow" &&
    !ownAdminCasePassthrough &&
    EMPLOYEE_BLOCKED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }

  if (isPublic || session) return <>{children}</>;
  return null;
}
