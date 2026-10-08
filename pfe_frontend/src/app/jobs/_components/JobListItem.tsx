import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  Eye,
  Globe,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type { JobOffer } from '@/domain/models/JobOffer';
import {
  formatEmploymentType,
  formatLocation,
  formatRelativeTime,
  formatSalary,
  formatWorkplaceType,
  getJobTags,
} from '../_utils/job-list-helpers';

function MetaChip({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-slate-700">
      {children}
    </span>
  );
}

interface JobListItemProps {
  job: JobOffer;
  detailsUrl: string;
  /** Omit to hide the apply button (e.g. for recruiters and admins). */
  onApply?: (job: JobOffer) => void;
}

export function JobListItem({ job, detailsUrl, onApply }: Readonly<JobListItemProps>) {
  const t = useTranslations('publicJobs.list');
  const locale = useLocale();

  const companyName = job.company?.name ?? t('job.unknownCompany');
  const companyLogo = job.company?.logoUrl;
  const tags = getJobTags(job);

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all duration-300 hover:border-blue-300 hover:shadow-lg">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden border border-slate-800 shadow-sm">
              {companyLogo ? (
                <Image src={companyLogo} alt={companyName} fill unoptimized className="object-cover" />
              ) : (
                companyName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <Link href={detailsUrl} className="group/link">
                <h3 className="text-lg font-bold text-slate-950 group-hover/link:text-blue-600 transition-colors flex items-center gap-1.5">
                  {job.title}
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity text-blue-600" />
                </h3>
              </Link>
              <p className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-400" /> {companyName}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600 mb-4">
                <MetaChip>
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {formatLocation(t, job)}
                </MetaChip>
                <MetaChip>
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />{' '}
                  {formatEmploymentType(t, job.employmentType)}
                </MetaChip>
                <MetaChip>
                  <Globe className="w-3.5 h-3.5 text-slate-400" />{' '}
                  {formatWorkplaceType(t, job.workplaceType)}
                </MetaChip>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200/60">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> {formatSalary(t, job)}
                </span>
                {/* Relative to "now", so the server and client renders can legitimately differ. */}
                <span suppressHydrationWarning className="inline-flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> {formatRelativeTime(t, job.createdAt, locale)}
                </span>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 border-slate-100 shrink-0">
            <Link href={detailsUrl}>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
                {t('job.viewDetails')}
              </Button>
            </Link>

            {onApply && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                onClick={() => onApply(job)}
              >
                {t('job.applyNow')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
