import type { useTranslations } from 'next-intl';
import type {
  JobEmploymentType,
  JobOffer,
  JobWorkplaceType,
} from '@/domain/models/JobOffer';
import type { User } from '@/domain/models/User';
import { getDashboardPath } from '@/lib/auth/routes';

export type ListT = ReturnType<typeof useTranslations<'publicJobs.list'>>;

export type PageItem = number | 'ellipsis';

export const EMPLOYMENT_TYPE_VALUES: JobEmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'CDD',
  'CDI',
  'INTERNSHIP',
];

export const WORKPLACE_TYPE_VALUES: JobWorkplaceType[] = ['REMOTE', 'HYBRID', 'ONSITE'];

/** Page size of the public job board, shared by the server prefetch and the client query. */
export const PAGE_SIZE = 6;

const MS_PER_HOUR = 1000 * 60 * 60;
const MAX_VISIBLE_TAGS = 4;

export function formatRelativeTime(t: ListT, dateString?: string, locale?: string): string {
  if (!dateString) return t('time.recently');
  const date = new Date(dateString);
  const diffHours = Math.max(0, Math.floor((Date.now() - date.getTime()) / MS_PER_HOUR));

  if (diffHours < 1) return t('time.justNow');
  if (diffHours < 24) return t('time.hoursAgo', { hours: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t('time.daysAgo', { days: diffDays });

  return date.toLocaleDateString(locale);
}

export function formatEmploymentType(t: ListT, type?: JobEmploymentType): string {
  if (!type) return t('employmentType.FULL_TIME');
  return t(`employmentType.${type}` as never);
}

export function formatWorkplaceType(t: ListT, type?: JobWorkplaceType): string {
  if (!type) return t('workplaceType.ONSITE');
  return t(`workplaceType.${type}` as never);
}

export function formatSalary(t: ListT, job: JobOffer): string {
  if (job.salaryMin && job.salaryMax) {
    const currency = job.currency || '$';
    return `${currency}${Number(job.salaryMin).toLocaleString()} - ${currency}${Number(job.salaryMax).toLocaleString()}`;
  }
  return t('job.salaryNegotiable');
}

export function formatLocation(t: ListT, job: JobOffer): string {
  return (
    [job.city, job.country].filter(Boolean).join(', ') ||
    job.location ||
    t('job.locationSpecified')
  );
}

export function getJobTags(job: JobOffer): string[] {
  return [...(job.requiredSkills ?? []), ...(job.preferredSkills ?? [])].slice(0, MAX_VISIBLE_TAGS);
}

/** Where the "back" arrow leads: the user's dashboard, or the landing page for visitors. */
export function getBackUrl(user: User | null | undefined): string {
  return user ? getDashboardPath(user.role) : '/';
}

/** Signed-in users see the job inside their own dashboard; visitors get the public page. */
export function getJobDetailsUrl(jobId: string, user: User | null | undefined): string {
  return user ? `${getDashboardPath(user.role)}/jobs/${jobId}` : `/jobs/${jobId}`;
}

export function getApplyUrl(jobId: string): string {
  return `/dashboard/candidate/apply?jobId=${jobId}`;
}

export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];
  if (current > 3) items.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) items.push(i);

  if (current < total - 2) items.push('ellipsis');
  items.push(total);
  return items;
}
