"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/authService";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const t = useTranslations("navbar");

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Always clear local state even if backend logout fails.
    } finally {
      logout();
      setIsMobileMenuOpen(false);
      router.push("/login");
    }
  };

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 shadow-[0_8px_32px_-4px_rgba(59,130,246,0.12),0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo href="/" size="md" />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex md:items-center md:gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href={
                    user?.role === "CANDIDATE"
                      ? "/dashboard/candidate"
                      : "/dashboard/recruiter"
                  }
                >
                  <Button variant="ghost">{t("dashboard")}</Button>
                </Link>
                <div className="flex items-center gap-2 pl-4 border-l">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {user?.firstName?.[0] || "U"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-500"
                  >
                    {t("logOut")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">{t("logIn")}</Button>
                </Link>
                <Link href="/register">
                  <Button>
                    {t("getStarted")}
                  </Button>
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="space-y-1 px-4 py-4">
            {isAuthenticated ? (
              <div className="pt-4 flex flex-col gap-2 border-t mt-2">
                <Link
                  href={
                    user?.role === "CANDIDATE"
                      ? "/dashboard/candidate"
                      : "/dashboard/recruiter"
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button variant="outline" className="w-full">
                    {t("dashboard")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full text-red-600"
                  onClick={handleLogout}
                >
                  {t("logOut")}
                </Button>
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {t("logIn")}
                  </Button>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full">{t("getStarted")}</Button>
                </Link>
              </div>
            )}
            <div className="pt-4 border-t mt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
