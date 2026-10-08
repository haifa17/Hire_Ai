"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  UserCircle2,
  Briefcase,
} from "lucide-react";
import { profileService } from "@/services/profileService";
import type { RecruiterProfileResponse } from "@/services/profileService";
import { getApiErrorMessage } from "@/services/authService";

export default function RecruiterProfilePage() {
  const t = useTranslations("recruiterDashboard.profile");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecruiterProfileResponse | null>(null);

  useEffect(() => {
    let active = true;

    profileService
      .getMyRecruiterProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          getApiErrorMessage(err, t("errors.loadFailed")),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("errors.notFound")}
        </div>
      </div>
    );
  }

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
      <section className={sectionClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {profile.user.photoUrl ? (
              <Image
                src={profile.user.photoUrl}
                alt={`${profile.user.firstName} ${profile.user.lastName}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover"
                unoptimized
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                <UserCircle2 className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <Link
            href="/profile/build?mode=edit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("editProfile")}
          </Link>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserCircle2 className="h-4 w-4 text-blue-600" />
          {t("sections.personalInfo.title")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.fullName")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.user.firstName} {profile.user.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.email")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-gray-400" />
              {profile.user.email || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.phone")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-gray-400" />
              {profile.user.phone || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.address")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {profile.user.address || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Briefcase className="h-4 w-4 text-blue-600" />
          {t("sections.positionInfo.title")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.position")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.profile.position || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fields.department")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.profile.department || "-"}
            </p>
          </div>
        </div>
      </section>

      {profile.profile.company && (
        <section className={sectionClass}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            {t("sections.companyInfo.title")}
          </div>

          <div className="space-y-4">
            {profile.profile.company.logoUrl && (
              <div className="flex items-center justify-center">
                <Image
                  src={profile.profile.company.logoUrl}
                  alt={profile.profile.company.name}
                  width={320}
                  height={80}
                  className="max-h-20 max-w-xs object-contain"
                  unoptimized
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t("fields.companyName")}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {profile.profile.company.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t("fields.industry")}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {profile.profile.company.industry || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t("fields.companySize")}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {profile.profile.company.companySize || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t("fields.phone")}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {profile.profile.company.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {t("fields.address")}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {profile.profile.company.address || "-"}
                </p>
              </div>
              {profile.profile.company.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {t("fields.description")}
                  </p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {profile.profile.company.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
