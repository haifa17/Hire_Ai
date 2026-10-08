import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, LogOut, Menu, MessageCircle, Search } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { getUserTitleKey } from "../_utils/navigation";

const ICON_BUTTON_CLASS =
  "rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors";

type DashboardTopbarProps = {
  isSidebarCollapsed: boolean;
  onMenuClick: () => void;
};

export function DashboardTopbar({
  isSidebarCollapsed,
  onMenuClick,
}: DashboardTopbarProps) {
  const t = useTranslations("dashboardShell");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore backend errors — always clear local state
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={onMenuClick}
        aria-label={t("sidebar.toggleSidebar")}
        title={isSidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={
            user?.role === "ADMIN"
              ? t("search.adminPlaceholder")
              : t("search.defaultPlaceholder")
          }
          className="form-input pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className={`relative ${ICON_BUTTON_CLASS}`}
          aria-label={t("topbar.notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON_CLASS}
          aria-label={t("topbar.messages")}
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        <LanguageSwitcher />

        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200 ml-1">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {user?.professionalTitle || t(getUserTitleKey(user?.role))}
            </p>
          </div>
          <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm overflow-hidden">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={t("avatarAlt")}
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.firstName?.[0] ?? "U")
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={t("topbar.signOut")}
            title={t("topbar.signOut")}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
