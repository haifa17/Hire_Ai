import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { useHydrated } from "../../../../hooks/useHydrated";

export type DashboardGateStatus = "loading" | "ready" | "blocked";

/**
 * Lets the dashboard render only for signed-in users who have a profile:
 * guests go to login, candidates and recruiters without a profile go to the
 * profile builder, and a failed profile check signs the user out.
 * "blocked" means a redirect is under way.
 */
export function useDashboardGate(): DashboardGateStatus {
  const router = useRouter();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  // Role whose profile check passed; compared with the current role so a
  // stale result never lets a different account through.
  const [checkedRole, setCheckedRole] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !role || role === "ADMIN") return;

    let active = true;

    profileService
      .hasCurrentUserProfile(role)
      .then((exists) => {
        if (!active) return;
        if (exists) setCheckedRole(role);
        else router.replace("/profile/build");
      })
      .catch(() => {
        if (!active) return;
        logout();
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [hydrated, isAuthenticated, role, router, logout]);

  if (!hydrated) return "loading";
  if (!isAuthenticated) return "blocked";
  // Only candidates and recruiters need a profile (as before the refactor,
  // a role-less session is let through).
  if (role !== "CANDIDATE" && role !== "RECRUITER") return "ready";
  return checkedRole === role ? "ready" : "loading";
}
