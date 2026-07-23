import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/shared/auth-provider";
import { AuthGate } from "@/components/shared/auth-gate";
import { DataProvider } from "@/components/shared/data-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneFlow Phase 1 — PPG Workday & Admin",
  description:
    "Phase 1 prototype: PPG Workday source system and OneFlow employee lifecycle platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <DataProvider>
            <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
              <AuthGate>{children}</AuthGate>
            </Suspense>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
