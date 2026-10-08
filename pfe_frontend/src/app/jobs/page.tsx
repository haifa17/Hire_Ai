import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { JobOfferListResponse } from '@/domain/models/JobOffer';
import { getServerApiBaseUrl } from '@/lib/server-api';
import { JobBoard } from './_components/JobBoard';
import { PAGE_SIZE } from './_utils/job-list-helpers';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('publicJobs.list');
  return { title: t('hero.title') };
}

/**
 * First page of the job board with its default criteria, so the list is in the
 * initial HTML. Must mirror the default filters in `useJobSearch`.
 *
 * Returns undefined on any failure: the client query then fetches on its own
 * and shows its usual loading/error states.
 */
async function getInitialJobs(): Promise<JobOfferListResponse | undefined> {
  const params = new URLSearchParams({
    page: '1',
    limit: String(PAGE_SIZE),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/api/v1/job-offers?${params}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return undefined;

    const payload = (await response.json()) as
      | { data?: JobOfferListResponse }
      | JobOfferListResponse;
    const list = 'data' in payload && payload.data ? payload.data : (payload as JobOfferListResponse);
    return Array.isArray(list.items) ? list : undefined;
  } catch {
    return undefined;
  }
}

export default async function JobSearchPage() {
  const initialJobs = await getInitialJobs();

  return <JobBoard initialJobs={initialJobs} />;
}
