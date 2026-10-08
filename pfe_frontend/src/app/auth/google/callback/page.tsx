"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { profileService } from "@/services/profileService";

type Status = "loading" | "success" | "error";

export default function GoogleAuthCallbackPage() {
  const t = useTranslations("auth.googleCallback");
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(t("completing"));

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      void router.replace(
        user.role === "ADMIN"
          ? "/dashboard/admin"
          : `/dashboard/${user.role.toLowerCase()}`,
      );
      return;
    }

    const bootstrapGoogleSession = async () => {
      try {
        const accessToken = await authService.refreshAccessToken();
        const currentUser = await authService.getCurrentUser();
        const normalizedUser = {
          ...currentUser,
          avatarUrl: currentUser.photoUrl ?? currentUser.avatarUrl,
        };

        setAuth(normalizedUser, accessToken);

        const role = normalizedUser.role;
        if (role === "ADMIN") {
          router.replace("/dashboard/admin");
          return;
        }

        let hasProfile = true;
        try {
          hasProfile = await profileService.hasCurrentUserProfile(role);
        } catch {
          hasProfile = true;
        }

        router.replace(
          hasProfile ? `/dashboard/${role.toLowerCase()}` : "/profile/build",
        );
      } catch {
        setStatus("error");
        setMessage(t("errorFallback"));
      }
    };

    void bootstrapGoogleSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role, router, setAuth]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 px-4">
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-130 w-130 rounded-full bg-blue-100/60" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white px-10 py-12 text-center shadow-lg">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-4">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              {t("errorHeading")}
            </h2>
            <p className="mb-8 max-w-70 text-sm text-gray-500">{message}</p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              {t("backToLogin")}
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-4">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              {t("successHeading")}
            </h2>
            <p className="mb-8 max-w-70 text-sm text-gray-500">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
