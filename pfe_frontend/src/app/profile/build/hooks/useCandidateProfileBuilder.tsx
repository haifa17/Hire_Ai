import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiErrorMessage } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { CANDIDATE_STEPS } from "../utils/candidate-steps";
import type { ProfileBuildMode } from "./useProfileBuildGate";

/** State and actions of the candidate profile wizard. */
export function useCandidateProfileBuilder(mode: ProfileBuildMode) {
  const t = useTranslations("profileBuilder.main");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const {
    profile,
    currentStep,
    setStep,
    nextStep,
    prevStep,
    getCompletionPercentage,
    resetProfile,
    setProfile,
    updatePersonalInfo,
  } = useProfileStore();

  const isEditMode = mode === "edit";
  const [isLoadingProfile, setIsLoadingProfile] = useState(isEditMode);
  const [loadFailure, setLoadFailure] = useState<{ cause: unknown } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create mode: seed the empty personal-info fields from the account.
  useEffect(() => {
    if (isEditMode) return;

    const { firstName, lastName, email } = profile.personalInfo;
    const seed: { firstName?: string; lastName?: string; email?: string } = {};

    if (!firstName && user?.firstName) seed.firstName = user.firstName;
    if (!lastName && user?.lastName) seed.lastName = user.lastName;
    if (!email && user?.email) seed.email = user.email;

    if (Object.keys(seed).length > 0) {
      updatePersonalInfo(seed);
    }
  }, [
    isEditMode,
    user?.firstName,
    user?.lastName,
    user?.email,
    profile.personalInfo,
    updatePersonalInfo,
  ]);

  // Edit mode: replace the local draft with the saved profile.
  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    profileService
      .getCandidateProfileForBuilder()
      .then((savedProfile) => {
        if (active) setProfile(savedProfile);
      })
      .catch((cause: unknown) => {
        if (active) setLoadFailure({ cause });
      })
      .finally(() => {
        if (active) setIsLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [isEditMode, setProfile]);

  const step = CANDIDATE_STEPS[currentStep - 1];
  const isLastStep = currentStep >= CANDIDATE_STEPS.length;
  const canContinue = step?.isComplete(profile) ?? false;

  const submit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const saved = isEditMode
        ? await profileService.updateCandidateProfileFromBuilder(profile)
        : await profileService.createCandidateProfileFromBuilder(profile);

      if (user) {
        updateUser({
          ...user,
          firstName: saved.user.firstName,
          lastName: saved.user.lastName,
          email: saved.user.email,
        });
      }

      if (!isEditMode) {
        resetProfile();
      }
      router.push(
        isEditMode ? "/dashboard/candidate/profile" : "/dashboard/candidate",
      );
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(
          err,
          isEditMode
            ? t("errorUpdateCandidateProfile")
            : t("errorCreateCandidateProfile"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (isLastStep) void submit();
    else nextStep();
  };

  const goBack = () => {
    if (currentStep > 1) prevStep();
    else router.push("/");
  };

  const loadError = loadFailure
    ? getApiErrorMessage(loadFailure.cause, t("errorLoadCandidateProfile"))
    : null;

  return {
    currentStep,
    /** Undefined only if the persisted step is out of range. */
    step,
    isLastStep,
    canContinue,
    /** Why the next button is disabled, as a `main.blocked` message key. */
    blockedKey: canContinue ? undefined : step?.blockedKey,
    completionPercentage: getCompletionPercentage(),
    isLoadingProfile,
    isSubmitting,
    error: submitError ?? loadError,
    goToStep: setStep,
    goNext,
    goBack,
  };
}
