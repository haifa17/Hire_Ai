import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getDashboardPath } from "@/lib/auth/routes";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { useRequireAuth } from "../../../../../hooks/useRequireAuth";

export type ProfileBuildMode = "create" | "edit";
export type ProfileBuilderRole = "CANDIDATE" | "RECRUITER";

type GateErrorKey = "errorNoExistingProfile" | "errorCheckProfile";

type CheckResult = {
  role: ProfileBuilderRole;
  errorKey: GateErrorKey | null;
};

export type ProfileBuildGate =
  | { status: "loading" }
  | { status: "ready"; role: ProfileBuilderRole; error: string | null };

/**
 * Decides whether the profile builder may render for the current user:
 * guests go to login, admins and users who already have a profile (outside
 * edit mode) go to their dashboard. "loading" covers both the check and any
 * pending redirect.
 */
export function useProfileBuildGate(mode: ProfileBuildMode): ProfileBuildGate {
  const t = useTranslations("profileBuilder.main");
  const router = useRouter();
  const auth = useRequireAuth();
  const role = useAuthStore((s) => s.user?.role);
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    if (auth !== "authenticated" || !role) return;

    if (role === "ADMIN") {
      router.replace(getDashboardPath(role));
      return;
    }

    let active = true;
    const isEditMode = mode === "edit";

    profileService
      .hasCurrentUserProfile(role)
      .then((exists) => {
        if (!active) return;

        if (exists && !isEditMode) {
          router.replace(getDashboardPath(role));
          return;
        }

        setResult({
          role,
          errorKey: !exists && isEditMode ? "errorNoExistingProfile" : null,
        });
      })
      .catch(() => {
        if (!active) return;
        // Still let the user in: the builder shows the error above the form.
        setResult({ role, errorKey: "errorCheckProfile" });
      });

    return () => {
      active = false;
    };
  }, [auth, role, mode, router]);

  if (auth !== "authenticated" || !result || result.role !== role) {
    return { status: "loading" };
  }

  return {
    status: "ready",
    role: result.role,
    error: result.errorKey ? t(result.errorKey) : null,
  };
}
