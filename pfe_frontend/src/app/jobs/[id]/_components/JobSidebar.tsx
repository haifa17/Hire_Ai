import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  DollarSign,
  Globe,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JobDetailsActions } from "@/components/job-offers/JobDetailsActions";
import { cn } from "@/lib/utils";
import type { JobOffer } from "@/domain/models/JobOffer";
import {
  formatEmploymentType,
  formatExperienceLevel,
  formatSalary,
  formatWorkplaceType,
  getRecruiterName,
} from "../_utils/job-detail-helpers";

const CARD_CLASS = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const CARD_TITLE_CLASS = "text-xs font-bold uppercase tracking-wider text-slate-400";

interface FactProps {
  icon: LucideIcon;
  /** Colours of the icon tile, e.g. "bg-sky-50 text-sky-600 border-sky-100/55". */
  iconClassName: string;
  label: string;
  value: string;
}

function Fact({ icon: Icon, iconClassName, label, value }: Readonly<FactProps>) {
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-slate-50 hover:border-slate-100">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border flex-shrink-0",
          iconClassName,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function QuickFactsCard({ job, applyHref }: Readonly<{ job: JobOffer; applyHref: string }>) {
  const t = useTranslations("publicJobs.detail");

  return (
    <div className={cn(CARD_CLASS, "space-y-6")}>
      <h3 className={CARD_TITLE_CLASS}>{t("sidebar.quickFacts")}</h3>

      <div className="space-y-4">
        <Fact
          icon={DollarSign}
          iconClassName="bg-emerald-50 text-emerald-600 border-emerald-100/55"
          label={t("sidebar.salary")}
          value={formatSalary(t, job)}
        />
        <Fact
          icon={Briefcase}
          iconClassName="bg-indigo-50 text-indigo-600 border-indigo-100/55"
          label={t("sidebar.employmentType")}
          value={formatEmploymentType(t, job.employmentType)}
        />
        <Fact
          icon={Globe}
          iconClassName="bg-sky-50 text-sky-600 border-sky-100/55"
          label={t("sidebar.workplaceType")}
          value={formatWorkplaceType(t, job.workplaceType)}
        />
        <Fact
          icon={Sparkles}
          iconClassName="bg-amber-50 text-amber-600 border-amber-100/55"
          label={t("sidebar.experienceLevel")}
          value={formatExperienceLevel(t, job.experienceLevel)}
        />
        {job.openings > 0 && (
          <Fact
            icon={Users}
            iconClassName="bg-rose-50 text-rose-600 border-rose-100/55"
            label={t("sidebar.openings")}
            value={t("sidebar.openingsValue", { count: job.openings })}
          />
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <Link href={applyHref} className="block w-full">
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-300 shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)]">
            {t("sidebar.applyNow")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CompanyCard({ company }: Readonly<{ company: NonNullable<JobOffer["company"]> }>) {
  const t = useTranslations("publicJobs.detail");

  return (
    <div className={cn(CARD_CLASS, "space-y-4")}>
      <h3 className={CARD_TITLE_CLASS}>{t("company.title")}</h3>

      <div className="flex items-center gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-12 w-12 rounded-xl object-cover border border-slate-200"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
            {company.name.charAt(0)}
          </div>
        )}
        <div>
          <h4 className="font-bold text-slate-800 leading-tight">{company.name}</h4>
          {company.industry && (
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">{company.industry}</p>
          )}
        </div>
      </div>

      {company.companySize && (
        <div className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-3 py-2 rounded-xl inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>{t("company.size", { count: company.companySize })}</span>
        </div>
      )}

      {company.description && (
        <p className="text-xs leading-relaxed text-slate-600 italic border-l-2 border-slate-200 pl-3">
          &ldquo;{company.description}&rdquo;
        </p>
      )}
    </div>
  );
}

function RecruiterCard({ job }: Readonly<{ job: JobOffer }>) {
  const t = useTranslations("publicJobs.detail");

  return (
    <div className={cn(CARD_CLASS, "space-y-3")}>
      <h3 className={CARD_TITLE_CLASS}>{t("recruiter.title")}</h3>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-800">
            {getRecruiterName(job) || t("recruiter.defaultName")}
          </h4>
          {job.recruiter?.email && (
            <a
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
              href={`mailto:${job.recruiter.email}`}
            >
              {t("recruiter.contact")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface JobSidebarProps {
  job: JobOffer;
  applyHref: string;
}

export function JobSidebar({ job, applyHref }: Readonly<JobSidebarProps>) {
  return (
    <div className="space-y-6">
      <QuickFactsCard job={job} applyHref={applyHref} />
      {job.company && <CompanyCard company={job.company} />}
      <RecruiterCard job={job} />

      {/* Role-aware actions (edit for the owner, apply/report otherwise) */}
      <div className="bg-slate-100/75 border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <JobDetailsActions job={job} />
      </div>
    </div>
  );
}
