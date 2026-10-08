import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useHydrated } from "./useHydrated";

export type AuthGateStatus = "loading" | "authenticated" | "guest";

/**
 * For signed-in-only pages. Redirects guests to the login page and reports
 * whether the page may render. Counterpart of `useRedirectIfAuthenticated`.
 */
export function useRequireAuth(): AuthGateStatus {
  const router = useRouter();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const isSignedIn = isAuthenticated && Boolean(role);

  useEffect(() => {
    if (!hydrated || isSignedIn) return;
    router.replace("/login");
  }, [hydrated, isSignedIn, router]);

  if (!hydrated) return "loading";
  return isSignedIn ? "authenticated" : "guest";
}
