"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/services/authService";

type UserRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

interface AdminUserDetails {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  candidateProfile: {
    professionalSummary?: string | null;
    openToWork?: boolean;
    desiredSalary?: string | number | null;
    desiredPosition?: string | null;
    socialLinks?: unknown;
    experiences?: unknown;
    education?: unknown;
    languages?: unknown;
    skills?: unknown;
    projects?: unknown;
    certifications?: unknown;
    createdAt: string;
    updatedAt: string;
  } | null;
  recruiterProfile:
    | {
        position?: string | null;
        department?: string | null;
        createdAt: string;
        updatedAt: string;
        company: {
          name: string;
          logoUrl?: string | null;
          address?: string | null;
          phone?: string | null;
          industry?: string | null;
          companySize?: string | null;
          description?: string | null;
        };
      }
    | null;
}

interface ApiEnvelope<T> {
  data: T;
}

function toneForRole(role: UserRole): string {
  if (role === "ADMIN") return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
  if (role === "RECRUITER") return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function pretty(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function displayValue(value: unknown, yesLabel = "Yes", noLabel = "No"): string {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? yesLabel : noLabel;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value.map((item) => displayValue(item, yesLabel, noLabel)).join(", ");
  return pretty(value);
}

function KeyValueBlock({
  title,
  value,
  noDataLabel,
}: Readonly<{
  title: string;
  value: unknown;
  noDataLabel: string;
}>) {
  const obj = toObject(value);
  const entries = Object.entries(obj);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">{noDataLabel}</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2">
          {entries.map(([key, itemValue]) => {
            const rendered = displayValue(itemValue);
            const isLink = /^https?:\/\//i.test(rendered);

            return (
              <div
                key={key}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {humanizeKey(key)}
                </p>
                {isLink ? (
                  <a
                    href={rendered}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-xs text-sky-700 underline underline-offset-2"
                  >
                    {rendered}
                  </a>
                ) : (
                  <p className="mt-1 break-words text-sm text-slate-700">{rendered}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArrayItemsBlock({
  title,
  value,
  noDataLabel,
}: Readonly<{
  title: string;
  value: unknown;
  noDataLabel: string;
}>) {
  const items = toArray(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">{noDataLabel}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => {
            const asObject = toObject(item);
            const objectEntries = Object.entries(asObject);

            if (objectEntries.length > 0) {
              return (
                <div
                  key={`${title}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {title} {index + 1}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {objectEntries.map(([k, v]) => (
                      <p key={k} className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{humanizeKey(k)}:</span>{" "}
                        {displayValue(v)}
                      </p>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${title}-${index}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {displayValue(item)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminUserDetailsPage() {
  const t = useTranslations("adminDashboard.userDetails");
  const params = useParams<{ id: string }>();
  const userId = useMemo(() => String(params?.id ?? ""), [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

      try {
        const res = await api.get<ApiEnvelope<AdminUserDetails>>(
          `/users/${userId}/details`,
        );

        if (!active) return;
        setDetails(res.data.data);
      } catch (err) {
        if (!active) return;
        setError(getApiErrorMessage(err, t("errors.load")));
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    }

    void loadDetails();
    return () => {
      active = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToUsers")}
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? t("errors.notFound")}
        </div>
      </div>
    );
  }

  const { user, candidateProfile, recruiterProfile } = details;
  const photoUrl = resolveAssetUrl(user.photoUrl);
  const companyLogoUrl = resolveAssetUrl(recruiterProfile?.company.logoUrl);

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 px-4 pb-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 -top-5 -z-10 h-56 rounded-[2rem] bg-gradient-to-r from-sky-100 via-cyan-100 to-emerald-100 blur-2xl" />

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToUsers")}
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-sky-100">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={t("labels.userPhotoAlt")} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sky-700">
                  <UserRound className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="min-w-[220px] flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span
                  className={`rounded-full border px-2.5 py-1 ${toneForRole(user.role)}`}
                >
                  {user.role}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    user.isActive
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "border-rose-200 bg-rose-100 text-rose-800"
                  }`}
                >
                  {user.isActive ? t("badges.active") : t("badges.suspended")}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    user.isEmailVerified
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "border-amber-200 bg-amber-100 text-amber-800"
                  }`}
                >
                  {user.isEmailVerified
                    ? t("badges.verified")
                    : t("badges.notVerified")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("labels.created")}</p>
              <p className="mt-1 text-xs text-slate-700">{formatDate(user.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("labels.updated")}</p>
              <p className="mt-1 text-xs text-slate-700">{formatDate(user.updatedAt)}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("labels.userId")}</p>
              <p className="mt-1 break-all text-xs text-slate-700">{user.id}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <Phone className="h-4 w-4 text-slate-500" />
            {user.phone || t("labels.noPhone")}
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <MapPin className="h-4 w-4 text-slate-500" />
            {user.address || t("labels.noAddress")}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t("labels.profileType")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {candidateProfile
              ? t("profileTypes.candidate")
              : recruiterProfile
                ? t("profileTypes.recruiter")
                : t("profileTypes.admin")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t("labels.accountStatus")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {user.isActive ? t("badges.enabled") : t("badges.suspended")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t("labels.verification")}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            {user.isEmailVerified
              ? t("badges.emailVerified")
              : t("badges.pendingVerification")}
          </p>
        </div>
      </section>

      {candidateProfile && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{t("candidate.title")}</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <CalendarClock className="h-3.5 w-3.5" />
              {t("labels.updatedOn", { date: formatDate(candidateProfile.updatedAt) })}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("candidate.desiredPosition")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{candidateProfile.desiredPosition || "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("candidate.desiredSalary")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{candidateProfile.desiredSalary ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("candidate.openToWork")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {candidateProfile.openToWork ? t("badges.yes") : t("badges.no")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("candidate.professionalSummary")}</p>
              <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {candidateProfile.professionalSummary || t("candidate.noSummary")}
              </p>
            </div>

            <KeyValueBlock title={t("candidate.socialLinks")} value={candidateProfile.socialLinks} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.skills")} value={candidateProfile.skills} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.experiences")} value={candidateProfile.experiences} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.education")} value={candidateProfile.education} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.languages")} value={candidateProfile.languages} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.projects")} value={candidateProfile.projects} noDataLabel={t("labels.noData")} />
            <ArrayItemsBlock title={t("candidate.certifications")} value={candidateProfile.certifications} noDataLabel={t("labels.noData")} />
          </div>
        </section>
      )}

      {recruiterProfile && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{t("recruiter.title")}</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <CalendarClock className="h-3.5 w-3.5" />
              {t("labels.updatedOn", { date: formatDate(recruiterProfile.updatedAt) })}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("recruiter.position")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{recruiterProfile.position || "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("recruiter.department")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{recruiterProfile.department || "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("recruiter.company")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{recruiterProfile.company.name}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {companyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companyLogoUrl} alt={t("recruiter.companyLogoAlt")} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{recruiterProfile.company.name}</h3>
                <p className="text-xs text-slate-600">{recruiterProfile.company.industry || t("recruiter.industryNotSet")}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <p><span className="font-medium text-slate-900">{t("recruiter.phone")}:</span> {recruiterProfile.company.phone || "-"}</p>
              <p><span className="font-medium text-slate-900">{t("recruiter.size")}:</span> {recruiterProfile.company.companySize || "-"}</p>
              <p><span className="font-medium text-slate-900">{t("recruiter.address")}:</span> {recruiterProfile.company.address || "-"}</p>
            </div>
            <p className="mt-3 text-xs text-slate-700">
              <span className="font-medium text-slate-900">{t("recruiter.description")}:</span> {recruiterProfile.company.description || "-"}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
