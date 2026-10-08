import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Building2, CalendarDays, Eye, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JobOffer } from "@/domain/models/JobOffer";
import { formatEmploymentType, formatLongDate } from "../_utils/job-detail-helpers";

const BADGE_CLASS =
  "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border";

interface JobHeroProps {
  job: JobOffer;
  applyHref: string;
}

export function JobHero({ job, applyHref }: Readonly<JobHeroProps>) {
  const t = useTranslations("publicJobs.detail");
  const locale = useLocale();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-10 shadow-xl border border-slate-800">
      {/* Glow circles */}
      <div className="absolute -right-16 -top-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {job.urgent && (
              <span className={`${BADGE_CLASS} bg-rose-500/25 text-rose-300 border-rose-500/30 animate-pulse`}>
                {t("badges.urgent")}
              </span>
            )}
            {job.featured && (
              <span className={`${BADGE_CLASS} bg-amber-500/25 text-amber-300 border-amber-500/30`}>
                {t("badges.featured")}
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              {formatEmploymentType(t, job.employmentType)}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                <Building2 className="h-4 w-4 text-indigo-300" />
              </span>
              <span className="font-medium text-white">
                {job.company?.name ?? t("unknownCompany")}
              </span>
            </span>

            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>
                {job.city}, {job.country}
              </span>
            </span>

            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>{t("hero.publishedOn", { date: formatLongDate(job.createdAt, locale) })}</span>
            </span>

            {job.views !== undefined && (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />
                <span>{t("hero.views", { count: job.views })}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-3">
          <Link href={applyHref} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200">
              <Send className="mr-2 h-4 w-4" />
              {t("hero.applyNow")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
