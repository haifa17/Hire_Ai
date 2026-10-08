"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase,
  CircleDollarSign,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  UserCircle2,
  Building2,
} from "lucide-react";
import { profileService } from "@/services/profileService";
import type { CandidateProfile } from "@/domain/models/Profile";
import { getApiErrorMessage } from "@/services/authService";
import { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations>;

function formatMonth(value: string | null | undefined, t: Translator): string {
  if (!value) return t("present");

  const safeDate = value.length === 7 ? `${value}-01` : value;
  const date = new Date(safeDate);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatYear(value: string | null | undefined, t: Translator): string {
  return value || t("present");
}

function formatSocialLabel(value: string, t: Translator): string {
  if (value.includes("linkedin.com")) return "LinkedIn";
  if (value.includes("github.com")) return "GitHub";
  return t("portfolio");
}

export default function CandidateProfilePage() {
  const t = useTranslations("candidateDashboard.profile");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    let active = true;

    profileService
      .getCandidateProfileForBuilder()
      .then((data) => {
        if (!active) return;
        setProfile(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          getApiErrorMessage(err, t("loadError")),
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
          {t("noProfileFound")}
        </div>
      </div>
    );
  }

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm";

  const socialLinks = [
    profile.personalInfo.linkedinUrl,
    profile.personalInfo.githubUrl,
    profile.personalInfo.portfolioUrl,
  ].filter((value) => value.trim().length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
      <section className={sectionClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {profile.personalInfo.photoUrl ? (
              <Image
                src={profile.personalInfo.photoUrl}
                alt={`${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`}
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
              <h1 className="text-2xl font-bold text-gray-900">{t("myProfile")}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t("myProfileSubtitle")}
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
          {t("personalInformation")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("fullName")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.personalInfo.firstName} {profile.personalInfo.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("email")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-gray-400" />
              {profile.personalInfo.email || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("phone")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-gray-400" />
              {profile.personalInfo.phone || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("location")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {profile.personalInfo.location || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("professionalSummary")}
            </p>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {profile.personalInfo.summary || t("noSummaryYet")}
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Briefcase className="h-4 w-4 text-blue-600" />
          {t("careerPreferences")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("openToWork")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.personalInfo.openToWork ? t("yes") : t("no")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("desiredPosition")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile.personalInfo.desiredPosition || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("desiredSalary")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4 text-gray-400" />
              {profile.personalInfo.desiredSalary || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Globe className="h-4 w-4 text-blue-600" />
          {t("socialLinks")}
        </div>

        {socialLinks.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noSocialLinks")}</p>
        ) : (
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              >
                {formatSocialLabel(link, t)}: {link}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {t("experience")}
        </h2>

        {profile.experiences.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noExperiences")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {profile.experiences.map((item) => (
              <div
                key={item.id}
                className="flex gap-3.5 rounded-lg border border-gray-200 p-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.jobTitle}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {item.companyName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatMonth(item.startDate, t)} –{" "}
                      {item.isCurrent ? t("present") : formatMonth(item.endDate, t)}
                    </span>
                  </div>

                  {(item.city || item.country || item.location) && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {[item.city, item.country].filter(Boolean).join(", ") ||
                          item.location}
                      </span>
                    </div>
                  )}

                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("education")}</h2>
        {profile.educations.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noEducation")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {profile.educations.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {item.degree}
                </p>
                <p className="text-sm text-gray-700">{item.institution}</p>
                {(item.city || item.country) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[item.city, item.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {formatYear(item.startYear, t)} -{" "}
                  {item.isCurrent ? t("present") : formatYear(item.endYear, t)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("skills")}</h2>
        {profile.skills.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noSkills")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((item) => (
              <span
                key={item.id}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {item.name} - {item.level}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("languages")}</h2>
        {profile.languages.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noLanguages")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.languages.map((item) => (
              <span
                key={item.id}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {item.name} - {item.proficiency}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("projects")}</h2>
        {profile.projects.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noProjects")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {profile.projects.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600">
                    {item.description}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700"
                  >
                    {item.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("certifications")}</h2>
        {profile.certifications.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noCertifications")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {profile.certifications.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {item.name}
                </p>
                <p className="text-sm text-gray-700">
                  {item.issuingOrganization || "-"}
                </p>
                <p className="text-xs text-gray-500">
                  {t("issueDate", { date: formatMonth(item.issueDate, t) })}
                </p>
                {item.credentialUrl && (
                  <a
                    href={item.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700"
                  >
                    {item.credentialUrl}
                  </a>
                )}
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t("viewCertificateDocument")}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
