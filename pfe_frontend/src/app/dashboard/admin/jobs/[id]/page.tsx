"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  DollarSign,
  Globe,
  Languages,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JobDetailsActions } from "@/components/job-offers/JobDetailsActions";
import { PublishButton } from "@/components/job-offers/PublishButton";
import { useJobOfferById } from "@/features/jobs/hooks/useJobOffers";

export default function AdminJobDetailsPage() {
  const t = useTranslations("adminDashboard.jobDetails");
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const query = useJobOfferById(id);

  if (query.isLoading) return <div className="p-4">{t("loading")}</div>;

  const job = query.data;
  if (!job) return <div className="p-4">{t("notFound")}</div>;

  const companyLogoUrl = job.company?.logoUrl?.startsWith("/")
    ? `${apiBaseUrl}${job.company.logoUrl}`
    : job.company?.logoUrl;

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-blue-50 px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        <article className="md:col-span-2 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <header className="space-y-3 border-b border-gray-100 pb-6">
            <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {job.status}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <p className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {job.company?.name}
              </p>
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {job.city}, {job.country}
              </p>
              <p className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {job.workplaceType}
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {t("posted", {
                  date: new Date(job.createdAt).toLocaleDateString(),
                })}
              </p>
            </div>
          </header>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("sections.about")}
            </h2>
            <p className="mt-3 whitespace-pre-line text-gray-700">
              {job.description}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("sections.responsibilities")}
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-700">
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("sections.requirements")}
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-700">
              {job.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("sections.requiredSkills")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {job.preferredSkills && job.preferredSkills.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("sections.preferredSkills")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.languages && job.languages.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("sections.languages")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700"
                  >
                    <Languages className="h-3 w-3" />
                    {lang}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("sections.benefits")}
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-700">
              {job.benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {job.deadline && (
            <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-900">
                {t("sections.applicationDeadline")}
              </p>
              <p className="mt-1 text-sm text-yellow-800">
                {new Date(job.deadline).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600">
              {t("footer.stats", {
                applications: job.applicationsCount,
                views: job.views,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/admin/jobs">
                <Button variant="outline">{t("footer.backToJobs")}</Button>
              </Link>
            </div>
          </footer>
        </article>

        <aside className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogoUrl}
                alt={job.company?.name ?? t("aside.companyLogoAlt")}
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600">
                {job.company?.name?.charAt(0) ?? "C"}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {job.company?.name}
              </p>
              <p className="text-xs text-gray-500">
                {job.company?.industry} • {job.company?.companySize}
              </p>
              {!companyLogoUrl && (
                <p className="mt-1 text-xs font-medium text-orange-600">
                  {t("aside.logoMissing")}
                </p>
              )}
            </div>
          </div>

          {job.status === "DRAFT" ? (
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-sm text-gray-600">
                {t("aside.draftNotice")}
              </p>
              <PublishButton
                jobOfferId={job.id}
                onPublished={() => {
                  query.refetch();
                }}
              />
            </div>
          ) : null}

          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              {t("aside.about", { company: job.company?.name ?? "" })}
            </p>
            <p className="mt-2 line-clamp-4 text-sm text-gray-600">
              {job.company?.description}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">
              {t("aside.postedBy")}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {job.recruiter?.firstName || t("aside.recruiterFallback")}{" "}
              {job.recruiter?.lastName ?? ""}
            </p>
            {job.recruiter?.email ? (
              <a
                className="mt-2 block text-sm text-blue-600"
                href={`mailto:${job.recruiter.email}`}
              >
                {t("aside.contact")}
              </a>
            ) : null}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">
              {t("aside.keyDetails")}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>
                  {job.salaryMin && job.salaryMax
                    ? `${job.currency} ${Number(job.salaryMin).toLocaleString()} - ${Number(job.salaryMax).toLocaleString()}`
                    : t("aside.notSpecified")}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <span>{job.employmentType}</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <span>{job.workplaceType}</span>
              </li>
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                <span>{job.experienceLevel}</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>
                  {t("aside.openings", { count: job.openings })}
                </span>
              </li>
            </ul>
          </div>

          <JobDetailsActions
            job={job}
            editHref={`/dashboard/admin/jobs/${job.id}/edit`}
          />
        </aside>
      </div>
    </div>
  );
}
