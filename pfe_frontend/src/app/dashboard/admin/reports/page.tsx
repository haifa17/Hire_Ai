"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ShieldAlert,
  Filter,
  ArrowUpDown,
  ExternalLink,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { jobReportService } from "@/services/jobReportService";
import type {
  JobReport,
  ReportStatus,
  ReportType,
} from "@/domain/models/JobReport";

function PaginationSummaryStrong({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="font-bold text-slate-800">{children}</span>;
}

function DeleteModalStrong({ children }: Readonly<{ children: ReactNode }>) {
  return <strong className="text-slate-900 font-bold">{children}</strong>;
}

const TYPE_STYLES: Record<ReportType, { bg: string; text: string }> = {
  FRAUD: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  INCORRECT_INFO: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  SPAM: { bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
  EXPIRED: { bg: "bg-slate-100 border-slate-200", text: "text-slate-700" },
  INAPPROPRIATE_CONTENT: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
  OTHER: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
};

export default function AdminReportsPage() {
  const t = useTranslations("adminDashboard.reports");
  const privateDetailsBasePath = "/dashboard/admin/jobs";
  const [reports, setReports] = useState<JobReport[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const TYPE_LABELS: Record<ReportType, string> = {
    FRAUD: t("types.FRAUD"),
    INCORRECT_INFO: t("types.INCORRECT_INFO"),
    SPAM: t("types.SPAM"),
    EXPIRED: t("types.EXPIRED"),
    INAPPROPRIATE_CONTENT: t("types.INAPPROPRIATE_CONTENT"),
    OTHER: t("types.OTHER"),
  };

  // Filters state
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<ReportType | "ALL">("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal confirm job deletion
  const [deletingJob, setDeletingJob] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action in-flight state
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await jobReportService.listAdminReports({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        page,
        limit,
        sortBy: "createdAt",
        sortOrder,
      });

      setReports(res.items);
      setTotalReports(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(t("errors.list"));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, page, limit, sortOrder, t]);

  useEffect(() => {
    const runFetch = () => {
      void fetchReports();
    };
    runFetch();
  }, [fetchReports]);

  const handleResolve = async (reportId: string) => {
    setResolvingId(reportId);
    try {
      await jobReportService.resolveReport(reportId);
      setActionSuccessMsg(t("messages.resolveSuccess"));
      await fetchReports();
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(t("errors.resolve"));
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteJobConfirm = async () => {
    if (!deletingJob) return;
    setIsDeleting(true);
    try {
      await jobReportService.deleteJobOffer(deletingJob.id);
      setActionSuccessMsg(
        t("messages.deleteSuccess", { title: deletingJob.title }),
      );
      setDeletingJob(null);
      await fetchReports();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(t("errors.deleteJob"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t("title")}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            <Clock className="h-3.5 w-3.5" />
            {t("countBadge", { count: totalReports })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            className="border-slate-200 bg-white shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            {t("actions.hide")}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
          >
            {t("actions.clear")}
          </button>
        </div>
      )}

      {/* Filters and Sorting bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("filters.statusLabel")}
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ReportStatus | "ALL");
                setPage(1);
              }}
              className="form-select w-auto"
            >
              <option value="ALL">{t("filters.allStatuses")}</option>
              <option value="PENDING">{t("status.PENDING")}</option>
              <option value="RESOLVED">{t("status.RESOLVED")}</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("filters.typeLabel")}
            </span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ReportType | "ALL");
                setPage(1);
              }}
              className="form-select w-auto"
            >
              <option value="ALL">{t("filters.allTypes")}</option>
              <option value="FRAUD">{t("types.FRAUD")}</option>
              <option value="INCORRECT_INFO">
                {t("types.INCORRECT_INFO")}
              </option>
              <option value="SPAM">{t("types.SPAM")}</option>
              <option value="EXPIRED">{t("types.EXPIRED")}</option>
              <option value="INAPPROPRIATE_CONTENT">
                {t("types.INAPPROPRIATE_CONTENT")}
              </option>
              <option value="OTHER">{t("types.OTHER")}</option>
            </select>
          </div>
        </div>

        {/* Sort order toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="border-slate-200 text-slate-700"
          >
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            {t("filters.dateLabel", {
              order:
                sortOrder === "desc"
                  ? t("filters.newest")
                  : t("filters.oldest"),
            })}
          </Button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {(() => {
          if (isLoading) {
            return (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            <p className="text-sm font-medium">{t("loading")}</p>
          </div>
            );
          }
          if (reports.length === 0) {
            return (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-slate-300 stroke-1" />
            <p className="text-base font-bold text-slate-700">
              {t("empty.title")}
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              {t("empty.description")}
            </p>
          </div>
            );
          }
          return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">{t("table.status")}</th>
                  <th className="px-6 py-3.5">{t("table.jobOffer")}</th>
                  <th className="px-6 py-3.5">{t("table.reasonAndType")}</th>
                  <th className="px-6 py-3.5">{t("table.reportedBy")}</th>
                  <th className="px-6 py-3.5">{t("table.date")}</th>
                  <th className="px-6 py-3.5 text-right">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.map((report) => {
                  const typeStyle =
                    TYPE_STYLES[report.type] ?? TYPE_STYLES.OTHER;
                  const typeLabel =
                    TYPE_LABELS[report.type] ?? TYPE_LABELS.OTHER;
                  const isResolved = report.status === "RESOLVED";
                  const isJobDeleted =
                    report.jobOffer?.deletedAt != null ||
                    report.jobOffer?.status === "CLOSED";

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {t("status.RESOLVED")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                            {t("status.PENDING")}
                          </span>
                        )}
                      </td>

                      {/* Job Title */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 line-clamp-1">
                            {report.jobOffer?.title ?? t("jobNotFound")}
                          </p>
                          {report.jobOffer?.company?.name && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span>{report.jobOffer.company.name}</span>
                            </p>
                          )}
                          {isJobDeleted && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                              {t("jobDeleted")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reason and Type */}
                      <td className="px-6 py-4 max-w-sm">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${typeStyle.bg} ${typeStyle.text}`}
                          >
                            {typeLabel}
                          </span>
                          <p className="text-xs leading-relaxed text-slate-700 line-clamp-2">
                            {report.reason}
                          </p>
                        </div>
                      </td>

                      {/* Reporting User */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {report.user?.firstName} {report.user?.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {report.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(report.createdAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {/* View Job Link */}
                        {report.jobOffer && (
                          <Link
                            href={`${privateDetailsBasePath}/${report.jobOffer.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            title={t("actions.viewJobTitle")}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                            <span className="hidden sm:inline">
                              {t("actions.view")}
                            </span>
                          </Link>
                        )}

                        {/* Resolve Button */}
                        {!isResolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resolvingId === report.id}
                            onClick={() => handleResolve(report.id)}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            {resolvingId === report.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                {t("actions.resolve")}
                              </>
                            )}
                          </Button>
                        )}

                        {/* Delete Job Button */}
                        {!isJobDeleted && report.jobOffer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDeletingJob({
                                id: report.jobOffer.id,
                                title: report.jobOffer.title,
                              })
                            }
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t("actions.deleteJob")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          );
        })()}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              {t.rich("pagination.summary", {
                page,
                totalPages,
                total: totalReports,
                strong: (chunks) => (
                  <PaginationSummaryStrong>{chunks}</PaginationSummaryStrong>
                ),
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-slate-200"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />{" "}
                {t("pagination.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-slate-200"
              >
                {t("pagination.next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Job Deletion */}
      {deletingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t("deleteModal.title")}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("deleteModal.irreversible")}
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              {t.rich("deleteModal.confirmText", {
                title: deletingJob.title,
                strong: (chunks) => (
                  <DeleteModalStrong>{chunks}</DeleteModalStrong>
                ),
              })}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeletingJob(null)}
                className="border-slate-200"
              >
                {t("deleteModal.cancel")}
              </Button>
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteJobConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("deleteModal.deleting")}
                  </>
                ) : (
                  t("deleteModal.confirm")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
