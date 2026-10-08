"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  UserCircle2,
  Building2,
  CircleDollarSign,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

function formatMonth(value: string | null | undefined, presentLabel: string): string {
  if (!value) return presentLabel;

  const safeDate = value.length === 7 ? `${value}-01` : value;
  const date = new Date(safeDate);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatYear(value: string | null | undefined, presentLabel: string): string {
  if (!value) return presentLabel;
  if (value.length >= 4) return value.slice(0, 4);
  return value;
}

function formatSocialLabel(value: string, labels: { linkedin: string; github: string; twitter: string; portfolio: string }): string {
  if (value.includes("linkedin.com")) return labels.linkedin;
  if (value.includes("github.com")) return labels.github;
  if (value.includes("twitter.com") || value.includes("x.com")) return labels.twitter;
  return labels.portfolio;
}

function resolvePhotoUrl(photoUrl?: string | null): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const cleanBase = apiBase.replace(/\/api\/v1\/?$/, "");
  return `${cleanBase}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
}

type LevelLabels = { beginner: string; intermediate: string; advanced: string; expert: string; native: string };

function formatSkillLevel(level: string | number | null | undefined, labels: LevelLabels): string {
  if (level === undefined || level === null || level === "") return "";
  const numLevel = typeof level === "number" ? level : Number.parseInt(String(level), 10);
  if (!Number.isNaN(numLevel)) {
    if (numLevel <= 1) return labels.beginner;
    if (numLevel === 2) return labels.intermediate;
    if (numLevel === 3) return labels.advanced;
    return labels.expert;
  }
  const str = String(level).trim().toUpperCase();
  if (str === "BEGINNER" || str === "BASIC") return labels.beginner;
  if (str === "INTERMEDIATE") return labels.intermediate;
  if (str === "ADVANCED") return labels.advanced;
  if (str === "EXPERT" || str === "MASTER") return labels.expert;
  return String(level);
}

function formatLanguageLevel(level: string | null | undefined, labels: LevelLabels): string {
  if (!level) return "";
  const str = String(level).trim().toUpperCase();
  if (str === "BEGINNER" || str === "BASIC") return labels.beginner;
  if (str === "INTERMEDIATE") return labels.intermediate;
  if (str === "ADVANCED") return labels.advanced;
  if (str === "NATIVE" || str === "FLUENT") return labels.native;
  return String(level);
}

function parseSocialLinks(rawSocial: unknown): string[] {
  if (!rawSocial) return [];
  if (Array.isArray(rawSocial)) {
    return rawSocial
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        const obj = item as { link?: string; url?: string } | null;
        return obj?.link || obj?.url || "";
      })
      .filter((link): link is string => typeof link === "string" && link.trim().length > 0);
  }
  if (typeof rawSocial === "object") {
    const keys = ["linkedinUrl", "linkedin", "githubUrl", "github", "portfolioUrl", "portfolio", "twitterUrl", "twitter", "website"];
    const links: string[] = [];
    const obj = rawSocial as Record<string, unknown>;
    for (const k of keys) {
      const value = obj[k];
      if (typeof value === "string" && value.trim().length > 0) {
        links.push(value.trim());
      }
    }
    return links;
  }
  return [];
}

function parseSkills(rawSkills: unknown, labels: LevelLabels): Array<{ name: string; level: string }> {
  if (!rawSkills) return [];
  const list = Array.isArray(rawSkills) ? rawSkills : [];
  return list
    .map((item: unknown) => {
      if (typeof item === "string") return { name: item, level: "" };
      const obj = item as { name?: string; skill?: string; level?: string | number; proficiency?: string | number } | null;
      const name = obj?.name || obj?.skill || "";
      const rawLevel = obj?.level ?? obj?.proficiency ?? "";
      return { name, level: formatSkillLevel(rawLevel, labels) };
    })
    .filter((s) => s.name.trim().length > 0);
}

function parseLanguages(rawLanguages: unknown, labels: LevelLabels): Array<{ name: string; level: string }> {
  if (!rawLanguages) return [];
  const list = Array.isArray(rawLanguages) ? rawLanguages : [];
  return list
    .map((item: unknown) => {
      if (typeof item === "string") return { name: item, level: "" };
      const obj = item as {
        name?: string;
        language?: string;
        languageName?: string;
        proficiency?: string;
        level?: string;
        proficiencyLevel?: string;
      } | null;
      const name = obj?.name || obj?.language || obj?.languageName || "";
      const rawLevel = obj?.proficiency || obj?.level || obj?.proficiencyLevel || "";
      return { name, level: formatLanguageLevel(rawLevel, labels) };
    })
    .filter((l) => l.name.trim().length > 0);
}

interface ExperienceItem {
  id?: string;
  jobTitle?: string;
  companyName?: string;
  locationStr?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

function parseExperiences(raw: unknown, positionFallback: string): ExperienceItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: item.id as string | undefined,
    jobTitle: (item.jobTitle || item.position || item.title || positionFallback) as string,
    companyName: (item.companyName || item.company || "") as string,
    locationStr: ([item.city, item.country].filter(Boolean).join(", ") || item.location || "") as string,
    startDate: item.startDate as string | undefined,
    endDate: item.endDate as string | undefined,
    isCurrent: (item.isCurrent ?? item.current ?? !item.endDate) as boolean,
    description: item.description as string | undefined,
  }));
}

interface EducationItem {
  id?: string;
  degree?: string;
  institution?: string;
  fieldOfStudy?: string;
  locationStr?: string;
  startYear?: string;
  endYear?: string;
  isCurrent?: boolean;
}

function parseEducations(raw: unknown): EducationItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: item.id as string | undefined,
    degree: (item.degree || "") as string,
    institution: (item.institution || item.school || "") as string,
    fieldOfStudy: (item.fieldOfStudy || item.field || "") as string,
    locationStr: [item.city, item.country].filter(Boolean).join(", "),
    startYear: (item.startYear || (typeof item.startDate === "string" ? item.startDate.slice(0, 4) : "")) as string,
    endYear: (item.endYear || (typeof item.endDate === "string" ? item.endDate.slice(0, 4) : "")) as string,
    isCurrent: (item.isCurrent ?? !item.endYear) as boolean,
  }));
}

interface ProjectItem {
  id?: string;
  title?: string;
  description?: string;
  url?: string;
}

function parseProjects(raw: unknown, projectFallback: string): ProjectItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: item.id as string | undefined,
    title: (item.title || projectFallback) as string,
    description: item.description as string | undefined,
    url: (item.url || item.link) as string | undefined,
  }));
}

interface CertificationItem {
  id?: string;
  name?: string;
  issuingOrganization?: string;
  issueDate?: string;
  credentialUrl?: string;
  fileUrl?: string;
}

function parseCertifications(raw: unknown, certificationFallback: string): CertificationItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: item.id as string | undefined,
    name: (item.name || item.title || certificationFallback) as string,
    issuingOrganization: (item.issuingOrganization || item.issuer || "-") as string,
    issueDate: item.issueDate as string | undefined,
    credentialUrl: item.credentialUrl as string | undefined,
    fileUrl: item.fileUrl as string | undefined,
  }));
}

interface CandidateUserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface CandidateProfileData {
  id: string;
  userId: string;
  professionalSummary?: string | null;
  openToWork?: boolean;
  desiredSalary?: number | null;
  desiredPosition?: string | null;
  socialLinks?: unknown;
  experiences?: unknown;
  education?: unknown;
  skills?: unknown;
  languages?: unknown;
  projects?: unknown;
  certifications?: unknown;
}

interface FullCandidatePayload {
  user: CandidateUserData;
  profile: CandidateProfileData | null;
}

export default function RecruiterCandidateProfilePage() {
  const t = useTranslations("recruiterDashboard.candidateProfile");
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";

  const [data, setData] = useState<FullCandidatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const startLoading = () => {
      setLoading(true);
      setError(null);
    };
    startLoading();

    api
      .get(`/profiles/candidate/${id}`)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setData(payload);
      })
      .catch((err) => {
        console.error(err);
        setError(t("loadError"));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error ?? t("profileNotFound")}</span>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  const { user, profile } = data;
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || t("candidateFallback");
  const resolvedPhoto = resolvePhotoUrl(user.photoUrl);

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm";

  const levelLabels = {
    beginner: t("levels.beginner"),
    intermediate: t("levels.intermediate"),
    advanced: t("levels.advanced"),
    expert: t("levels.expert"),
    native: t("levels.native"),
  };
  const socialLabels = {
    linkedin: t("socialLabels.linkedin"),
    github: t("socialLabels.github"),
    twitter: t("socialLabels.twitter"),
    portfolio: t("socialLabels.portfolio"),
  };
  const presentLabel = t("present");

  // Parse fields safely
  const experiences = parseExperiences(profile?.experiences, t("positionFallback"));
  const educations = parseEducations(profile?.education);
  const projects = parseProjects(profile?.projects, t("projectFallback"));
  const certifications = parseCertifications(profile?.certifications, t("certificationFallback"));

  const skillItems = parseSkills(profile?.skills, levelLabels);
  const languageItems = parseLanguages(profile?.languages, levelLabels);
  const socialLinks = parseSocialLinks(profile?.socialLinks);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8 pb-12">
      {/* Top Header Card */}
      <section className={sectionClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {resolvedPhoto ? (
              <Image
                src={resolvedPhoto}
                alt={fullName}
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
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {profile?.desiredPosition ? `${profile.desiredPosition} • ` : ""}{t("candidateProfileLabel")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("back")}
          </button>
        </div>
      </section>

      {/* Personal Information */}
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
              {fullName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("email")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-gray-400" />
              {user.email || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("phone")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-gray-400" />
              {user.phone || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("location")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {user.address || "-"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("professionalSummary")}
            </p>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {profile?.professionalSummary || t("noSummary")}
            </p>
          </div>
        </div>
      </section>

      {/* Career Preferences */}
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
              {profile?.openToWork ? t("yes") : t("no")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("desiredPosition")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {profile?.desiredPosition || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t("desiredSalary")}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4 text-gray-400" />
              {profile?.desiredSalary ? `$${Number(profile.desiredSalary).toLocaleString()}` : "-"}
            </p>
          </div>
        </div>
      </section>

      {/* Social Links */}
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
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {formatSocialLabel(link, socialLabels)}: {link}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Experience */}
      <section className={sectionClass}>
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {t("sections.experience")}
        </h2>

        {experiences.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.experiences")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {experiences.map((item, idx) => (
              <div
                key={item.id ?? idx}
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
                      {item.companyName && (
                        <p className="mt-0.5 text-sm text-gray-500">
                          {item.companyName}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatMonth(item.startDate, presentLabel)} –{" "}
                      {item.isCurrent ? presentLabel : formatMonth(item.endDate, presentLabel)}
                    </span>
                  </div>

                  {item.locationStr && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {item.locationStr}
                      </span>
                    </div>
                  )}

                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 whitespace-pre-line">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Education */}
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.education")}</h2>
        {educations.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.education")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {educations.map((item, idx) => (
              <div
                key={item.id ?? idx}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {item.degree} {item.fieldOfStudy ? t("educationFieldOf", { field: item.fieldOfStudy }) : ""}
                </p>
                {item.institution && (
                  <p className="text-sm text-gray-700">{item.institution}</p>
                )}
                {item.locationStr && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.locationStr}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatYear(item.startYear, presentLabel)} -{" "}
                  {item.isCurrent ? presentLabel : formatYear(item.endYear, presentLabel)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills */}
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.skills")}</h2>
        {skillItems.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.skills")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {skillItems.map((item, idx) => (
              <span
                key={`${item.name}-${idx}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {item.name}{item.level ? ` - ${item.level}` : ""}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Languages */}
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.languages")}</h2>
        {languageItems.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.languages")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {languageItems.map((item, idx) => (
              <span
                key={`${item.name}-${idx}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {item.name}{item.level ? ` - ${item.level}` : ""}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.projects")}</h2>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.projects")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {projects.map((item, idx) => (
              <div
                key={item.id ?? idx}
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

      {/* Certifications */}
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold text-gray-900">{t("sections.certifications")}</h2>
        {certifications.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("empty.certifications")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {certifications.map((item, idx) => (
              <div
                key={item.id ?? idx}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {item.name}
                </p>
                <p className="text-sm text-gray-700">
                  {item.issuingOrganization || "-"}
                </p>
                {item.issueDate && (
                  <p className="text-xs text-gray-500">
                    {t("issueDate", { date: formatMonth(item.issueDate, presentLabel) })}
                  </p>
                )}
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
                    {t("viewCertificate")}
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
