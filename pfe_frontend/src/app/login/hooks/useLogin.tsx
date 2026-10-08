import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authService, getApiErrorMessage } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { PROFILE_BUILD_PATH, getDashboardPath } from "@/lib/auth/routes";

type LoginUser = Awaited<ReturnType<typeof authService.login>>["user"];

export type LoginCredentials = { email: string; password: string; keepLoggedIn?: boolean; };

type Status = "idle" | "submitting" | "redirecting";

/** Admins go straight to their dashboard; others must have a profile. */
async function getPostLoginPath(user: LoginUser): Promise<string> {
  const dashboard = getDashboardPath(user.role);
  if (user.role === "ADMIN") return dashboard;

  try {
    const hasProfile = await profileService.hasCurrentUserProfile(user.role);
    return hasProfile ? dashboard : PROFILE_BUILD_PATH;
  } catch {
    // A failed profile check must never block sign-in.
    return dashboard;
  }
}

export function useLogin() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ email, password, keepLoggedIn }: LoginCredentials) => {
    if (status !== "idle") return;

    setError(null);
    setStatus("submitting");
    try {
      const { user, tokens } = await authService.login(email, password, {
        keepLoggedIn,
      });

      // Mark as redirecting *before* the store flips to authenticated, so the
      // guest-page redirect doesn't race with our own destination.
      setStatus("redirecting");
      setAuth(user, tokens.accessToken);

      router.replace(await getPostLoginPath(user));
    } catch (err) {
      setError(getApiErrorMessage(err, t("errorFallback")));
      setStatus("idle");
    }
  };

  const signInWithGoogle = () => {
    window.location.href = authService.getGoogleAuthUrl({ flow: "signin" });
  };

  return { status, error, submit, signInWithGoogle };
}