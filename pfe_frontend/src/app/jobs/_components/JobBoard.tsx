'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import type { JobOffer, JobOfferListResponse } from '@/domain/models/JobOffer';
import { JobFiltersSidebar } from './JobFiltersSidebar';
import { JobListItem } from './JobListItem';
import { JobListEmpty, JobListError, JobListSkeleton } from './JobListStates';
import { JobPagination } from './JobPagination';
import { JobSearchHero } from './JobSearchHero';
import { useJobSearch, type JobSortOption } from '../_hooks/useJobSearch';
import { getApplyUrl, getBackUrl, getJobDetailsUrl } from '../_utils/job-list-helpers';

interface JobBoardProps {
  /** First page of results fetched on the server; absent if that fetch failed. */
  initialJobs?: JobOfferListResponse;
}

export function JobBoard({ initialJobs }: Readonly<JobBoardProps>) {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('publicJobs.list');
  const search = useJobSearch(initialJobs);

  const canApply = !user || user.role === 'CANDIDATE';

  const handleApply = (job: JobOffer) => {
    const applyUrl = getApplyUrl(job.id);
    if (user) {
      router.push(applyUrl);
      return;
    }
    toast.error(t('toast.loginRequired'));
    router.push(`/login?redirect=${encodeURIComponent(applyUrl)}`);
  };

  const handlePageChange = (page: number) => {
    search.setPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderJobs = () => {
    if (search.isLoading) return <JobListSkeleton />;
    if (search.isError) return <JobListError />;
    if (search.jobs.length === 0) {
      return (
        <JobListEmpty onClearFilters={search.hasActiveFilters ? search.clearFilters : undefined} />
      );
    }
    return search.jobs.map((job) => (
      <JobListItem
        key={job.id}
        job={job}
        detailsUrl={getJobDetailsUrl(job.id, user)}
        onApply={canApply ? handleApply : undefined}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 font-sans antialiased">
      <JobSearchHero
        backUrl={getBackUrl(user)}
        search={search.searchInput}
        location={search.locationInput}
        onSearchChange={search.setSearchInput}
        onLocationChange={search.setLocationInput}
        onSubmit={search.submitSearch}
        hasActiveFilters={search.hasActiveFilters}
        onClearFilters={search.clearFilters}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col md:flex-row gap-8">
        <JobFiltersSidebar
          employmentTypes={search.employmentTypes}
          workplaceTypes={search.workplaceTypes}
          onToggleEmploymentType={search.toggleEmploymentType}
          onToggleWorkplaceType={search.toggleWorkplaceType}
          hasActiveFilters={search.hasActiveFilters}
          onReset={search.clearFilters}
        />

        <section className="flex-1 space-y-4">
          <div className="flex justify-between items-center px-1 mb-2">
            <p className="text-sm text-slate-500 font-medium">
              {t('results.showing', { shown: search.jobs.length, total: search.totalItems })}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                {t('sort.label')}
              </span>
              <select
                value={search.sortOption}
                onChange={(e) => search.changeSort(e.target.value as JobSortOption)}
                className="form-select w-auto"
              >
                <option value="newest">{t('sort.newest')}</option>
                <option value="oldest">{t('sort.oldest')}</option>
              </select>
            </div>
          </div>

          {renderJobs()}

          <JobPagination
            page={search.page}
            totalPages={search.totalPages}
            totalItems={search.totalItems}
            hasPrevious={search.hasPrevious}
            hasNext={search.hasNext}
            disabled={search.isLoading}
            onPageChange={handlePageChange}
          />
        </section>
      </main>
    </div>
  );
}
