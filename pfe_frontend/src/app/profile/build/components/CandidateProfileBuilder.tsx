"use client";

import { useTranslations } from "next-intl";
import { Info, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/auth/ErrorAlert";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import { ProfileSidebar } from "@/features/profile/components/ProfileSidebar";
import { useCandidateProfileBuilder } from "../hooks/useCandidateProfileBuilder";
import type { ProfileBuildMode } from "../hooks/useProfileBuildGate";

type CandidateProfileBuilderProps = {
  mode: ProfileBuildMode;
  /** Problem found while checking access (e.g. nothing to edit yet). */
  gateError: string | null;
};

export function CandidateProfileBuilder({
  mode,
  gateError,
}: CandidateProfileBuilderProps) {
  const t = useTranslations("profileBuilder.main");
  const builder = useCandidateProfileBuilder(mode);
  const isEditMode = mode === "edit";

  if (builder.isLoadingProfile) return <FullPageSpinner />;

  const StepComponent = builder.step?.Component;
  const finalButtonLabel = isEditMode ? t("saveChanges") : t("finishProfile");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? t("titleEdit") : t("titleCreate")}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isEditMode ? t("subtitleEdit") : t("subtitleCreate")}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <ProfileSidebar
          currentStep={builder.currentStep}
          completionPercentage={builder.completionPercentage}
          onStepClick={builder.goToStep}
        />

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <ErrorAlert message={builder.error ?? gateError} className="mb-5" />

            {StepComponent && <StepComponent />}

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <Button variant="ghost" onClick={builder.goBack}>
                {t("back")}
              </Button>
              <Button
                onClick={builder.goNext}
                isLoading={builder.isSubmitting}
                size="md"
                disabled={!builder.canContinue}
              >
                {builder.isLastStep ? finalButtonLabel : t("saveAndContinue")}
              </Button>
            </div>

            {/* A disabled button on its own doesn't say what is missing. */}
            {builder.blockedKey && (
              <p
                role="status"
                className="mt-3 flex items-start justify-end gap-1.5 text-right text-xs text-amber-700"
              >
                <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t(`blocked.${builder.blockedKey}`)}
              </p>
            )}
          </div>

          {StepComponent && (
            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 leading-relaxed">
                <span className="font-semibold">{t("proTipLabel")} </span>
                {t(`proTips.${builder.currentStep}`)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
