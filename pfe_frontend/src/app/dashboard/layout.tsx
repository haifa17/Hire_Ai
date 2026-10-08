"use client";

import type { ReactNode } from "react";
import { DashboardShell } from "./_components/DashboardShell";
import { useDashboardGate } from "./_hooks/useDashboardGate";

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const gate = useDashboardGate();

  if (gate === "loading") return <LoadingScreen />;
  if (gate === "blocked") return null; // redirecting

  return <DashboardShell>{children}</DashboardShell>;
}
