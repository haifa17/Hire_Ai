import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Heart,
  Languages,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOffer } from "@/domain/models/JobOffer";
import { formatLongDate } from "../_utils/job-detail-helpers";

const CARD_CLASS =
  "rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300";

interface SectionCardProps {
  icon: LucideIcon;
  /** Background + text colour of the icon tile, e.g. "bg-sky-50 text-sky-600". */
  iconClassName: string;
  title: string;
  children: ReactNode;
}

function SectionCard({ icon: Icon, iconClassName, title, children }: Readonly<SectionCardProps>) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className={cn("p-2 rounded-lg", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface BulletListProps {
  items: string[];
  bullet: ReactNode;
  bulletClassName: string;
}

function BulletList({ items, bullet, bulletClassName }: Readonly<BulletListProps>) {
  return (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border mt-0.5",
              bulletClassName,
            )}
          >
            {bullet}
          </span>
          <span className="text-sm leading-6 text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TagList({ items, tagClassName }: Readonly<{ items: string[]; tagClassName: string }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-default",
            tagClassName,
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** Main column of the job page: description, lists, skills, benefits, deadline. */
export function JobContent({ job }: Readonly<{ job: JobOffer }>) {
  const t = useTranslations("publicJobs.detail");
  const locale = useLocale();

  const responsibilities = job.responsibilities ?? [];
  const requirements = job.requirements ?? [];
  const requiredSkills = job.requiredSkills ?? [];
  const languages = job.languages ?? [];
  const benefits = job.benefits ?? [];

  return (
    <div className="space-y-6">
      <SectionCard
        icon={Briefcase}
        iconClassName="bg-indigo-50 text-indigo-600"
        title={t("sections.aboutRole")}
      >
        <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{job.description}</p>
      </SectionCard>

      {responsibilities.length > 0 && (
        <SectionCard
          icon={Sparkles}
          iconClassName="bg-sky-50 text-sky-600"
          title={t("sections.responsibilities")}
        >
          <BulletList
            items={responsibilities}
            bullet={<ChevronRight className="h-3 w-3" />}
            bulletClassName="bg-sky-50 text-sky-600 border-sky-100"
          />
        </SectionCard>
      )}

      {requirements.length > 0 && (
        <SectionCard
          icon={Award}
          iconClassName="bg-indigo-50 text-indigo-600"
          title={t("sections.requirements")}
        >
          <BulletList
            items={requirements}
            bullet={<Check className="h-3.5 w-3.5 font-bold" />}
            bulletClassName="bg-indigo-50 text-indigo-600 border-indigo-100"
          />
        </SectionCard>
      )}

      {(requiredSkills.length > 0 || languages.length > 0) && (
        <div className={cn(CARD_CLASS, "space-y-6")}>
          {requiredSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                {t("sections.requiredSkills")}
              </h3>
              <TagList
                items={requiredSkills}
                tagClassName="border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700"
              />
            </div>
          )}

          {languages.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Languages className="h-4 w-4 text-emerald-600" />
                {t("sections.languages")}
              </h3>
              <TagList
                items={languages}
                tagClassName="border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-700"
              />
            </div>
          )}
        </div>
      )}

      {benefits.length > 0 && (
        <SectionCard
          icon={Heart}
          iconClassName="bg-emerald-50 text-emerald-600"
          title={t("sections.benefits")}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium text-slate-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {job.deadline && (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-950">{t("deadline.title")}</h3>
            <p className="mt-1 text-sm text-rose-800 leading-relaxed font-semibold">
              {formatLongDate(job.deadline, locale)}
            </p>
            <p className="mt-0.5 text-xs text-rose-700/80">{t("deadline.note")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
