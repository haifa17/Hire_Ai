import type { ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarState } from "../_hooks/useSidebarState";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";

/** Sidebar + top bar frame. Render only once the dashboard gate is ready. */
export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const role = useAuthStore((s) => s.user?.role);
  const sidebar = useSidebarState();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar
        role={role}
        isOpen={sidebar.isOpen}
        isCollapsed={sidebar.isCollapsed}
        onToggleCollapsed={sidebar.toggleCollapsed}
        onClose={sidebar.close}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <DashboardTopbar
          isSidebarCollapsed={sidebar.isCollapsed}
          onMenuClick={sidebar.toggleFromMenuButton}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
