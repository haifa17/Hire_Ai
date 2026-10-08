"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import type { ProfileBuildMode } from "../hooks/useProfileBuildGate";
import { useRecruiterProfileForm } from "../hooks/useRecruiterProfileForm";
import { RecruiterCompanySection } from "./recruiter/RecruiterCompanySection";
import { RecruiterPersonalSection } from "./recruiter/RecruiterPersonalSection";
import { RecruiterSecuritySection } from "./recruiter/RecruiterSecuritySection";

type RecruiterProfileSetupProps = {
  mode: ProfileBuildMode;
};

export function RecruiterProfileSetup({ mode }: RecruiterProfileSetupProps) {
  const t = useTranslations("profileBuilder.recruiterSetup");
  const form = useRecruiterProfileForm(mode);
  const isEditMode = mode === "edit";

  if (form.isLoadingProfile) return <FullPageSpinner />;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void form.submit();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode ? t("subtitleEdit") : t("subtitleCreate")}
        </p>

        <ErrorAlert message={form.error} className="mt-4" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <RecruiterPersonalSection
          values={form.values}
          setField={form.setField}
          avatarPreviewUrl={form.avatarPreviewUrl}
          onAvatarChange={form.setAvatarFile}
        />

        <RecruiterCompanySection
          values={form.values}
          setField={form.setField}
          logoPreviewUrl={form.logoPreviewUrl}
          onLogoChange={form.setLogoFile}
          isEnhancingDescription={form.isEnhancingDescription}
          descriptionError={form.descriptionError}
          onEnhanceDescription={form.enhanceDescription}
        />

        <RecruiterSecuritySection />

        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={form.isSubmitting}
            disabled={!form.canSubmit}
          >
            {isEditMode ? t("submitEdit") : t("submitCreate")}
          </Button>
        </div>
      </form>
    </div>
  );
}
