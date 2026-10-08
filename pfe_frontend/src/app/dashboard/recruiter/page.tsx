'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Briefcase,
  Users,
  Eye,
  Sparkles,
  ArrowRight,
  Plus,
  Loader2,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMyCompanyJobOffers } from '@/features/jobs/hooks/useJobOffers';
import api from '@/lib/api';
import type { JobOffer } from '@/domain/models/JobOffer';
import { cn } from '@/lib/utils';

interface RawApplicantData {
  id: string;
  candidate?: {
    firstName?: string;
    lastName?: string;
    user?: { firstName?: string; lastName?: string };
  };
  matchingScore?: number | null;
  score?: number | null;
  status?: string;
  createdAt?: string;
}

interface ApplicantSummary {
  id: string;
  candidateName: string;
  candidateInitials: string;
  jobId: string;
  jobTitle: string;
  matchingScore?: number | null;
  status: string;
  appliedAt: string;
}

export default function RecruiterDashboard() {
  const t = useTranslations('recruiterDashboard.overview');
  const { data: companyJobsData, isLoading: isLoadingJobs } = useMyCompanyJobOffers({});
  const jobs: JobOffer[] = useMemo(
    () => companyJobsData?.items ?? [],
    [companyJobsData],
  );

  const [recentApplicants, setRecentApplicants] = useState<ApplicantSummary[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true);

  // Pagination states (3 items per page)
  const [applicantsPage, setApplicantsPage] = useState(1);
  const applicantsLimit = 3;

  const [jobsPage, setJobsPage] = useState(1);
  const jobsLimit = 3;

  // Compute dynamic stats
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'PUBLISHED'), [jobs]);
  const totalApplicantsCount = useMemo(
    () => jobs.reduce((sum, j) => sum + (j.applicationsCount ?? 0), 0),
    [jobs]
  );
  const totalViewsCount = useMemo(
    () => jobs.reduce((sum, j) => sum + (j.views ?? 0), 0),
    [jobs]
  );

  // Fetch applicants for recruiter's jobs
  useEffect(() => {
    let isMounted = true;

    const fetchAllApplicants = async () => {
      if (!jobs || jobs.length === 0) {
        if (isMounted) {
          setRecentApplicants([]);
          setIsLoadingApplicants(false);
        }
        return;
      }

      setIsLoadingApplicants(true);

      try {
        const activeJobIds = jobs.map((j) => j.id);
        const responses = await Promise.allSettled(
          activeJobIds.map((id) => api.get(`/applications/job/${id}`))
        );

        const allApps: ApplicantSummary[] = [];

        responses.forEach((res, index) => {
          if (res.status === 'fulfilled' && res.value?.data) {
            const rawData = res.value.data?.data ?? res.value.data ?? [];
            const job = jobs[index];

            if (Array.isArray(rawData)) {
              rawData.forEach((app: RawApplicantData) => {
                const candidate = app.candidate;
                const firstName = candidate?.firstName ?? candidate?.user?.firstName ?? '';
                const lastName = candidate?.lastName ?? candidate?.user?.lastName ?? '';
                const name = `${firstName} ${lastName}`.trim() || t('candidateFallbackName');
                const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'CA';

                allApps.push({
                  id: app.id,
                  candidateName: name,
                  candidateInitials: initials,
                  jobId: job.id,
                  jobTitle: job.title,
                  matchingScore: app.matchingScore ?? app.score ?? null,
                  status: app.status ?? 'PENDING',
                  appliedAt: app.createdAt ?? new Date().toISOString(),
                });
              });
            }
          }
        });

        // Sort by match score (highest first)
        allApps.sort((a, b) => (b.matchingScore ?? 0) - (a.matchingScore ?? 0));

        if (isMounted) {
          setRecentApplicants(allApps);
        }
      } catch (err) {
        console.error('Failed to load dashboard applicants:', err);
      } finally {
        if (isMounted) {
          setIsLoadingApplicants(false);
        }
      }
    };

    fetchAllApplicants();

    return () => {
      isMounted = false;
    };
  }, [jobs]);

  // Paginated Slices
  const paginatedApplicants = useMemo(() => {
    const start = (applicantsPage - 1) * applicantsLimit;
    return recentApplicants.slice(start, start + applicantsLimit);
  }, [recentApplicants, applicantsPage, applicantsLimit]);

  const totalApplicantsPages = useMemo(
    () => Math.max(1, Math.ceil(recentApplicants.length / applicantsLimit)),
    [recentApplicants, applicantsLimit]
  );

  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * jobsLimit;
    return jobs.slice(start, start + jobsLimit);
  }, [jobs, jobsPage, jobsLimit]);

  const totalJobsPages = useMemo(
    () => Math.max(1, Math.ceil(jobs.length / jobsLimit)),
    [jobs, jobsLimit]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 animate-fade-in-up pb-12">
      {/* Welcome header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {t('heading')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/dashboard/recruiter/jobs/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" /> {t('postNewJob')}
          </Button>
        </Link>
      </div>

      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="shadow-xs hover:shadow-md transition-all rounded-3xl border border-slate-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('stats.activeJobs')}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoadingJobs ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : activeJobs.length}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
              <span className="text-slate-700 font-bold mr-1">{t('stats.totalCount', { count: jobs.length })}</span> {t('stats.jobOffersPosted')}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-all rounded-3xl border border-slate-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('stats.totalApplicants')}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoadingJobs ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : totalApplicantsCount}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
              {t('stats.acrossPublished')}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-all rounded-3xl border border-slate-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('stats.totalViews')}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoadingJobs ? <Loader2 className="w-6 h-6 animate-spin text-purple-600" /> : totalViewsCount}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                <Eye className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
              {t('stats.candidateViews')}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:shadow-md transition-all rounded-3xl border border-slate-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('stats.aiCandidatesRanked')}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoadingApplicants ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : recentApplicants.length}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-slate-500">
              {t('stats.scoredByAi')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Candidates pipeline */}
        <Card className="shadow-xs rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" /> {t('topCandidates.title')}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">
                    {t('topCandidates.description')}
                  </CardDescription>
                </div>
                <Link href="/dashboard/recruiter/applicants">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    {t('topCandidates.viewAll')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                if (isLoadingApplicants) {
                  return (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-medium">{t('topCandidates.loading')}</p>
                </div>
                  );
                }
                if (recentApplicants.length === 0) {
                  return (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <UserRound className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">{t('topCandidates.empty.title')}</p>
                  <p className="text-xs text-slate-500">{t('topCandidates.empty.description')}</p>
                </div>
                  );
                }
                return (
                <ul className="divide-y divide-slate-100">
                  {paginatedApplicants.map((app) => (
                    <li key={app.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-11 w-11 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0 text-sm">
                            {app.candidateInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{app.candidateName}</p>
                            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{t('topCandidates.appliedFor', { job: app.jobTitle })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {app.matchingScore !== null && app.matchingScore !== undefined && (
                            <span className="inline-flex font-mono items-center rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                              {t('topCandidates.matchPercent', { percent: Math.round(app.matchingScore) })}
                            </span>
                          )}
                          <Link href={`/dashboard/recruiter/applicants/${app.id}`}>
                            <Button size="sm" variant="outline" className="border-slate-200">
                              {t('topCandidates.review')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                );
              })()}
            </CardContent>
          </div>

          {totalApplicantsPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500">
              <span>
                {t('pagination.applicantsSummary', { page: applicantsPage, total: totalApplicantsPages, count: recentApplicants.length })}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={applicantsPage <= 1}
                  onClick={() => setApplicantsPage((p) => Math.max(1, p - 1))}
                  className="border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> {t('pagination.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={applicantsPage >= totalApplicantsPages}
                  onClick={() => setApplicantsPage((p) => Math.min(totalApplicantsPages, p + 1))}
                  className="border-slate-200"
                >
                  {t('pagination.next')} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Active Jobs */}
        <Card className="shadow-xs rounded-3xl border border-slate-200/80 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{t('activeJobs.title')}</CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500">{t('activeJobs.description')}</CardDescription>
                </div>
                <Link href="/dashboard/recruiter/jobs">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    {t('activeJobs.manage')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                if (isLoadingJobs) {
                  return (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-xs font-medium">{t('activeJobs.loading')}</p>
                </div>
                  );
                }
                if (jobs.length === 0) {
                  return (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Briefcase className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">{t('activeJobs.empty.title')}</p>
                  <p className="text-xs text-slate-500 mb-3">{t('activeJobs.empty.description')}</p>
                  <Link href="/dashboard/recruiter/jobs/create">
                    <Button size="sm" className="bg-blue-600 text-white">
                      {t('activeJobs.empty.postJob')}
                    </Button>
                  </Link>
                </div>
                  );
                }
                return (
                <ul className="divide-y divide-slate-100">
                  {paginatedJobs.map((job) => (
                    <li key={job.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/dashboard/recruiter/jobs/${job.id}`}>
                              <p className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                {job.title}
                              </p>
                            </Link>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[job.city, job.country].filter(Boolean).join(', ')} • {job.workplaceType}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                              job.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {job.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="text-center">
                            <p className="text-xs text-slate-400 font-medium">{t('activeJobs.views')}</p>
                            <p className="text-sm font-extrabold text-slate-900">{job.views ?? 0}</p>
                          </div>
                          <div className="text-center border-l border-slate-200">
                            <p className="text-xs text-slate-400 font-medium">{t('activeJobs.applicants')}</p>
                            <p className="text-sm font-extrabold text-slate-900">{job.applicationsCount ?? 0}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                );
              })()}
            </CardContent>
          </div>

          {totalJobsPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500">
              <span>
                {t('pagination.jobsSummary', { page: jobsPage, total: totalJobsPages, count: jobs.length })}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={jobsPage <= 1}
                  onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                  className="border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> {t('pagination.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={jobsPage >= totalJobsPages}
                  onClick={() => setJobsPage((p) => Math.min(totalJobsPages, p + 1))}
                  className="border-slate-200"
                >
                  {t('pagination.next')} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
