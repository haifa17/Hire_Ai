import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { aiEnhanceService } from "@/services/aiEnhanceService";
import { getApiErrorMessage } from "@/services/authService";
import { profileService, toAbsoluteAssetUrl } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { useFilePreview } from "./useFilePreview";
import type { ProfileBuildMode } from "./useProfileBuildGate";

export type RecruiterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  department: string;
  companyName: string;
  companyIndustry: string;
  companyPhone: string;
  companySize: string;
  companyAddress: string;
  companyDescription: string;
};

export type SetRecruiterField = (
  field: keyof RecruiterFormValues,
  value: string,
) => void;

const REQUIRED_FIELDS: (keyof RecruiterFormValues)[] = [
  "firstName",
  "lastName",
  "email",
  "position",
  "department",
  "companyName",
];

/** State and actions of the recruiter profile form (create and edit). */
export function useRecruiterProfileForm(mode: ProfileBuildMode) {
  const t = useTranslations("profileBuilder.recruiterSetup");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const isEditMode = mode === "edit";

  const [values, setValues] = useState<RecruiterFormValues>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    position: "",
    department: "",
    companyName: "",
    companyIndustry: "",
    companyPhone: "",
    companySize: "",
    companyAddress: "",
    companyDescription: "",
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatarUrl ?? null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(isEditMode);
  const [loadFailure, setLoadFailure] = useState<{ cause: unknown } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const avatarPreviewUrl = useFilePreview(avatarFile) ?? avatarUrl;
  const logoPreviewUrl = useFilePreview(logoFile) ?? logoUrl;

  const setField: SetRecruiterField = (field, value) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  // Edit mode: load the saved profile into the form.
  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    profileService
      .getMyRecruiterProfile()
      .then(({ user: savedUser, profile }) => {
        if (!active) return;

        // Read at resolve time so the effect does not re-run (and refetch)
        // when the account in the store is updated.
        const account = useAuthStore.getState().user;
        const company = profile.company;

        setValues({
          firstName: savedUser.firstName ?? account?.firstName ?? "",
          lastName: savedUser.lastName ?? account?.lastName ?? "",
          email: savedUser.email ?? account?.email ?? "",
          phone: savedUser.phone ?? "",
          address: savedUser.address ?? "",
          position: profile.position ?? "",
          department: profile.department ?? "",
          companyName: company?.name ?? "",
          companyIndustry: company?.industry ?? "",
          companyPhone: company?.phone ?? "",
          companySize: company?.companySize ?? "",
          companyAddress: company?.address ?? "",
          companyDescription: company?.description ?? "",
        });
        setLogoUrl(toAbsoluteAssetUrl(company?.logoUrl) ?? null);
        setAvatarUrl(
          toAbsoluteAssetUrl(savedUser.photoUrl) ?? account?.avatarUrl ?? null,
        );
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
  }, [isEditMode]);

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined,
        position: values.position,
        department: values.department,
        company: {
          name: values.companyName,
          industry: values.companyIndustry || undefined,
          phone: values.companyPhone || undefined,
          companySize: values.companySize || undefined,
          address: values.companyAddress || undefined,
          description: values.companyDescription || undefined,
        },
      };

      const saved = isEditMode
        ? await profileService.updateRecruiterProfile(payload)
        : await profileService.createRecruiterProfile(payload);

      if (logoFile) {
        await profileService.uploadRecruiterCompanyLogo(logoFile);
      }

      const uploadedAvatarUrl = avatarFile
        ? await profileService.uploadCurrentUserPhoto(avatarFile)
        : null;

      if (user) {
        updateUser({
          ...user,
          firstName: saved.user.firstName,
          lastName: saved.user.lastName,
          email: saved.user.email,
          avatarUrl: uploadedAvatarUrl ?? user.avatarUrl,
        });
      }

      if (uploadedAvatarUrl) {
        setAvatarUrl(uploadedAvatarUrl);
        setAvatarFile(null);
      }

      router.push(
        isEditMode ? "/dashboard/recruiter/profile" : "/dashboard/recruiter",
      );
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, t("errorSubmit")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const enhanceDescription = async () => {
    setDescriptionError(null);

    if (!values.companyDescription.trim()) {
      setDescriptionError(t("errorEnhanceDescriptionEmpty"));
      return;
    }

    setIsEnhancingDescription(true);
    try {
      const enhanced = await aiEnhanceService.enhanceText({
        target: "company_description",
        text: values.companyDescription,
        context: {
          companyName: values.companyName,
          companyIndustry: values.companyIndustry,
          companySize: values.companySize,
          companyAddress: values.companyAddress,
          recruiterPosition: values.position,
          recruiterDepartment: values.department,
        },
      });

      setField("companyDescription", enhanced);
    } catch (err) {
      setDescriptionError(
        err instanceof Error ? err.message : t("errorEnhanceDescriptionFailed"),
      );
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const loadError = loadFailure
    ? getApiErrorMessage(loadFailure.cause, t("errorLoadProfile"))
    : null;

  return {
    values,
    setField,
    avatarPreviewUrl,
    setAvatarFile,
    logoPreviewUrl,
    setLogoFile,
    isLoadingProfile,
    isSubmitting,
    error: submitError ?? loadError,
    canSubmit: REQUIRED_FIELDS.every((field) => values[field].trim()),
    submit,
    isEnhancingDescription,
    descriptionError,
    enhanceDescription,
  };
}
