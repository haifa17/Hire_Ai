import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import type { User } from "@/domain/models/User";
import { getNavigation } from "../_utils/navigation";

type DashboardSidebarProps = {
  role?: User["role"];
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onClose: () => void;
};

export function DashboardSidebar({
  role,
  isOpen,
  isCollapsed,
  onToggleCollapsed,
  onClose,
}: DashboardSidebarProps) {
  const t = useTranslations("dashboardShell");
  const pathname = usePathname();
  const collapseLabel = isCollapsed ? t("sidebar.expand") : t("sidebar.collapse");
  const actionClass = cn(
    "flex w-full items-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
    isCollapsed ? "justify-center px-2" : "justify-center px-4",
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label={t("sidebar.closeSidebar")}
          className="fixed inset-0 z-40 w-full bg-gray-900/50 lg:hidden cursor-default"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "lg:w-56",
          "w-56",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-gray-100 px-4",
            isCollapsed ? "justify-between lg:justify-center lg:px-2" : "justify-between",
          )}
        >
          <Logo href="/" size="md" collapsed={isCollapsed} />

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {getNavigation(role).map((item) => {
            const isActive = pathname === item.href.split("?")[0];
            const label = t(`nav.${item.nameKey}` as never);
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isCollapsed ? "lg:justify-center lg:px-2" : "",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-gray-400")}
                />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          {role === "CANDIDATE" && (
            <Link
              href="/dashboard/resumes/create"
              title={isCollapsed ? t("actions.generateNewCv") : undefined}
              className={cn(
                actionClass,
                "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20",
              )}
            >
              <Upload className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{t("actions.generateNewCv")}</span>}
            </Link>
          )}
          {role === "ADMIN" && (
            <button
              type="button"
              title={isCollapsed ? t("actions.newReport") : undefined}
              className={cn(
                actionClass,
                "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{t("actions.newReport")}</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
