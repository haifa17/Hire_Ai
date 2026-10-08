"use client";

import { useRef, useState, ChangeEvent } from "react";
import Image from "next/image";
import {
  Camera,
  Globe,
  Link2,
  Mail,
  MapPin,
  Phone,
  User,
  Sparkles,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getApiErrorMessage } from "@/services/authService";
import { profileService, toAbsoluteAssetUrl } from "@/services/profileService";
import { aiEnhanceService } from "@/services/aiEnhanceService";

export function PersonalInfoStep() {
  const t = useTranslations("profileBuilder.steps.personalInfo");
  const { profile, updatePersonalInfo } = useProfileStore();
  const { user, updateUser } = useAuthStore();
  const { personalInfo } = profile;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t("photoTooLarge"));
      return;
    }

    const tempPreviewUrl = URL.createObjectURL(file);
    updatePersonalInfo({ photoUrl: tempPreviewUrl });

    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await profileService.uploadCandidatePhoto(file);
      updatePersonalInfo({ photoUrl: uploadedUrl });

      if (user) {
        updateUser({
          ...user,
          avatarUrl: toAbsoluteAssetUrl(uploadedUrl),
        });
      }
    } catch (error) {
      setPhotoError(getApiErrorMessage(error, t("photoUploadFailed")));
      updatePersonalInfo({ photoUrl: personalInfo.photoUrl });
    } finally {
      URL.revokeObjectURL(tempPreviewUrl);
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleEnhanceSummary() {
    setSummaryError(null);
    setIsEnhancingSummary(true);

    try {
      const enhancedSummary = await aiEnhanceService.enhanceText({
        target: "professional_summary",
        text: personalInfo.summary,
        context: {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          desiredPosition: personalInfo.desiredPosition,
          location: personalInfo.location,
          skills: profile.skills.map((skill) => skill.name),
          experiences: profile.experiences.map((experience) => ({
            jobTitle: experience.jobTitle,
            companyName: experience.companyName,
          })),
        },
      });

      updatePersonalInfo({ summary: enhancedSummary });
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : t("enhanceSummaryFailed"),
      );
    } finally {
      setIsEnhancingSummary(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("title")}</h2>
      <p className="text-xs text-gray-500 mb-4">{t("requiredFieldsHint")}</p>

      {/* Profile Photo */}
      <div className="flex items-center gap-5 py-5 border-b border-gray-100">
        <div className="relative">
          <div className="relative w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            {personalInfo.photoUrl ? (
              <Image
                src={personalInfo.photoUrl}
                alt={t("profileAlt")}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <Camera className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md"
            aria-label={t("editPhoto")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {t("profilePhoto")}
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {t("profilePhotoHint")}
          </p>
          {photoError && (
            <p className="text-xs text-red-600 mb-2">{photoError}</p>
          )}
          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isUploadingPhoto ? t("uploading") : t("uploadImage")}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.firstName")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="firstName"
                type="text"
                placeholder={t("fields.firstNamePlaceholder")}
                value={personalInfo.firstName}
                onChange={(e) =>
                  updatePersonalInfo({ firstName: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.lastName")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="lastName"
                type="text"
                placeholder={t("fields.lastNamePlaceholder")}
                value={personalInfo.lastName}
                onChange={(e) =>
                  updatePersonalInfo({ lastName: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.email")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                placeholder={t("fields.emailPlaceholder")}
                value={personalInfo.email}
                onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                aria-describedby="email-hint"
                className="form-input pl-9"
              />
            </div>
            <p id="email-hint" className="mt-1.5 text-xs text-gray-500">
              {t("emailHint")}
            </p>
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.phone")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="phone"
                type="tel"
                placeholder={t("fields.phonePlaceholder")}
                value={personalInfo.phone}
                onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                maxLength={30}
                aria-describedby="phone-hint"
                className="form-input pl-9"
              />
            </div>
            <p id="phone-hint" className="mt-1.5 text-xs text-gray-500">
              {t("phoneHint")}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.location")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="location"
              type="text"
              placeholder={t("fields.locationPlaceholder")}
              value={personalInfo.location}
              onChange={(e) => updatePersonalInfo({ location: e.target.value })}
              className="form-input pl-9"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="summary"
              className="text-sm font-medium text-gray-700"
            >
              {t("fields.summary")} <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleEnhanceSummary}
              disabled={isEnhancingSummary}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 px-2 py-0.5 rounded-full transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {isEnhancingSummary ? t("enhancing") : t("aiRewrite")}
            </button>
          </div>
          <textarea
            id="summary"
            rows={4}
            placeholder={t("fields.summaryPlaceholder")}
            value={personalInfo.summary}
            onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
            className="form-textarea resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("fields.summaryHint")}
          </p>
          {summaryError && (
            <p className="text-xs text-red-600 mt-1">{summaryError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="desiredPosition"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.desiredPosition")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="desiredPosition"
                type="text"
                placeholder={t("fields.desiredPositionPlaceholder")}
                value={personalInfo.desiredPosition}
                onChange={(e) =>
                  updatePersonalInfo({ desiredPosition: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="desiredSalary"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("fields.desiredSalary")}
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="desiredSalary"
                type="number"
                min="0"
                step="100"
                placeholder={t("fields.desiredSalaryPlaceholder")}
                value={personalInfo.desiredSalary}
                onChange={(e) =>
                  updatePersonalInfo({ desiredSalary: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {t("openToWork")}
              </p>
              <p className="text-xs text-gray-500">{t("openToWorkHint")}</p>
            </div>
            <button
              type="button"
              aria-label={t("toggleOpenToWork")}
              onClick={() =>
                updatePersonalInfo({ openToWork: !personalInfo.openToWork })
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${personalInfo.openToWork ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${personalInfo.openToWork ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {t("socialLinks")}
          </h3>
          <p className="mt-1 mb-3 text-xs text-gray-500">{t("linksHint")}</p>
          <div className="space-y-3">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="url"
                placeholder={t("linkedinPlaceholder")}
                value={personalInfo.linkedinUrl}
                onChange={(e) =>
                  updatePersonalInfo({ linkedinUrl: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>

            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="url"
                placeholder={t("githubPlaceholder")}
                value={personalInfo.githubUrl}
                onChange={(e) =>
                  updatePersonalInfo({ githubUrl: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>

            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="url"
                placeholder={t("portfolioPlaceholder")}
                value={personalInfo.portfolioUrl}
                onChange={(e) =>
                  updatePersonalInfo({ portfolioUrl: e.target.value })
                }
                className="form-input pl-9"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
