import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { getDashboardPath } from "@/lib/auth/routes";
import { useHydrated } from "./useHydrated";

export type GuestGateStatus = "loading" | "authenticated" | "guest";

type Options = {
  /**
   * Set to false to suspend the redirect, e.g. while a sign-in flow is
   * choosing its own destination.
   */
  enabled?: boolean;
};

/**
 * For guest-only pages (login, register…). Redirects signed-in users to their
 * role dashboard and reports whether the page may render.
 */
export function useRedirectIfAuthenticated({
  enabled = true,
}: Options = {}): GuestGateStatus {
  const router = useRouter();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (!enabled || !hydrated || !isAuthenticated || !role) return;
    router.replace(getDashboardPath(role));
  }, [enabled, hydrated, isAuthenticated, role, router]);

  if (!hydrated) return "loading";
  return isAuthenticated ? "authenticated" : "guest";
}