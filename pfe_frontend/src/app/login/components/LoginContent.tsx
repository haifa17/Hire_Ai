"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/auth/AuthShell";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { OrDivider } from "@/components/auth/OrDivider";
import { useLogin } from "../hooks/useLogin";
import { LoginForm } from "./LoginForm";
import { useRedirectIfAuthenticated } from "../../../../hooks/useRedirectIfAuthenticated";

export function LoginContent() {
    const t = useTranslations("auth.login");
    const { status, error, submit, signInWithGoogle } = useLogin();
    const isSigningIn = status !== "idle";

    // While signing in we pick the destination ourselves (dashboard vs profile
    // setup), so the "already authenticated" redirect is suspended.
    const gate = useRedirectIfAuthenticated({ enabled: !isSigningIn });

    if (gate === "loading") return <FullPageSpinner />;
    if (gate === "authenticated" && !isSigningIn) return null; // redirecting

    return (
        <AuthShell className="py-10">
            <h1 className="text-center text-3xl font-bold text-gray-900">
                {t("heading")}
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">{t("subheading")}</p>

            <ErrorAlert message={error} className="mt-6" />

            <div className="mt-8">
                <GoogleButton
                    onClick={signInWithGoogle}
                    className="gap-2 rounded-lg py-2.5"
                >
                    {t("google")}
                </GoogleButton>
            </div>

            <OrDivider label={t("orContinueWithEmail")} />

            <LoginForm isSubmitting={isSigningIn} onSubmit={submit} />

            <p className="mt-6 text-center text-sm text-gray-500">
                {t("newToPlatform")}{" "}
                <Link
                    href="/register"
                    className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
                >
                    {t("createAccount")}
                </Link>
            </p>
        </AuthShell>
    );
}