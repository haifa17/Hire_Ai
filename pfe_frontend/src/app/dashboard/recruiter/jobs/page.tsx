"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/job-offers/JobCard";
import { JobFilters } from "@/components/job-offers/JobFilters";
import { JobTable } from "@/components/job-offers/JobTable";
import { useMyCompanyJobOffers } from "@/features/jobs/hooks/useJobOffers";
import {
  JobOfferListEmpty,
  JobOfferListSkeleton,
  JobOfferPagination,
  ViewModeToggle,
} from "../../_components/JobOfferListParts";
import { useJobOfferActions } from "../../_hooks/useJobOfferActions";
import { useJobOfferFilters } from "../../_hooks/useJobOfferFilters";

const CREATE_JOB_HREF = "/dashboard/recruiter/jobs/create";

export default function RecruiterJobsPage() {
  const t = useTranslations("recruiterDashboard.jobs");
  const list = useJobOfferFilters();
  const jobsQuery = useMyCompanyJobOffers(list.filters);
  const { handleClose, handleDelete } = useJobOfferActions(
    {
      confirmDelete: t("confirmDelete"),
      closeSuccess: t("toasts.closeSuccess"),
      closeError: t("toasts.closeError"),
      deleteSuccess: t("toasts.deleteSuccess"),
      deleteError: t("toasts.deleteError"),
    },
    jobsQuery.refetch,
  );

  const jobs = jobsQuery.data?.items ?? [];
  const pagination = jobsQuery.data?.pagination;

  const renderJobs = () => {
    if (jobsQuery.isLoading) return <JobOfferListSkeleton />;
    if (jobs.length === 0) {
      return (
        <JobOfferListEmpty
          title={t("empty.title")}
          description={t("empty.subtitle")}
        >
          <Link href={CREATE_JOB_HREF} className="mt-4 inline-flex">
            <Button>{t("createJobOffer")}</Button>
          </Link>
        </JobOfferListEmpty>
      );
    }
    if (list.viewMode === "table") {
      return (
        <JobTable jobs={jobs} onClose={handleClose} onDelete={handleDelete} />
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onClose={handleClose} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => jobsQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
          <Link href={CREATE_JOB_HREF}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("newJobOffer")}
            </Button>
          </Link>
        </div>
      </header>

      <JobFilters
        filters={list.filters}
        onChange={list.setFilters}
        onReset={list.resetFilters}
      />

      <ViewModeToggle
        value={list.viewMode}
        onChange={list.setViewMode}
        labels={{ table: t("viewMode.table"), cards: t("viewMode.cards") }}
      />

      {renderJobs()}

      {pagination && (
        <JobOfferPagination
          pagination={pagination}
          summary={t("pageInfo", {
            page: pagination.page,
            totalPages: pagination.totalPages,
            total: pagination.total,
          })}
          previousLabel={t("previous")}
          nextLabel={t("next")}
          onPrevious={list.goToPreviousPage}
          onNext={list.goToNextPage}
        />
      )}
    </div>
  );
}
