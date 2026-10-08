"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { jobReportService } from "@/services/jobReportService";
import type { ReportType } from "@/domain/models/JobReport";

interface ReportJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOfferId: string;
  jobTitle: string;
  recruiterId?: string;
  onSuccess?: () => void;
}

const REPORT_TYPE_KEYS: {
  value: ReportType;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: "FRAUD",
    labelKey: "types.fraud.label",
    descriptionKey: "types.fraud.description",
  },
  {
    value: "INCORRECT_INFO",
    labelKey: "types.incorrectInfo.label",
    descriptionKey: "types.incorrectInfo.description",
  },
  {
    value: "SPAM",
    labelKey: "types.spam.label",
    descriptionKey: "types.spam.description",
  },
  {
    value: "EXPIRED",
    labelKey: "types.expired.label",
    descriptionKey: "types.expired.description",
  },
  {
    value: "INAPPROPRIATE_CONTENT",
    labelKey: "types.inappropriateContent.label",
    descriptionKey: "types.inappropriateContent.description",
  },
  {
    value: "OTHER",
    labelKey: "types.other.label",
    descriptionKey: "types.other.description",
  },
];

export function ReportJobModal({
  isOpen,
  onClose,
  jobOfferId,
  jobTitle,
  recruiterId,
  onSuccess,
}: Readonly<ReportJobModalProps>) {
  const t = useTranslations("candidateDashboard.jobDetail.reportModal");
  const { user, isAuthenticated } = useAuthStore();
  const [reportType, setReportType] = useState<ReportType>("FRAUD");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAlreadyReported, setHasAlreadyReported] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOwner = isAuthenticated && user?.id === recruiterId;

  useEffect(() => {
    if (isOpen && isAuthenticated && jobOfferId && !isOwner) {
      jobReportService
        .checkUserReport(jobOfferId)
        .then((res) => setHasAlreadyReported(res.hasReported))
        .catch(() => setHasAlreadyReported(false));
    }
  }, [isOpen, isAuthenticated, jobOfferId, isOwner]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg(t("validation.required"));
      return;
    }

    if (reason.trim().length < 5) {
      setErrorMsg(t("validation.minLength"));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await jobReportService.createReport({
        jobOfferId,
        type: reportType,
        reason: reason.trim(),
      });

      setSuccessMsg(t("success"));
      setHasAlreadyReported(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setReason("");
      }, 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message ?? t("errors.submit");
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("title")}</h2>
              <p className="text-xs text-slate-500 line-clamp-1 max-w-[260px] sm:max-w-[320px]">
                {jobTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content conditionals */}
        {(() => {
          if (isOwner) {
            return (
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>{t("owner.title")}</span>
            </div>
            <p className="text-xs text-amber-700">{t("owner.message")}</p>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                {t("close")}
              </Button>
            </div>
          </div>
            );
          }
          if (hasAlreadyReported) {
            return (
          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{t("alreadyReported.title")}</span>
            </div>
            <p className="text-xs text-emerald-700">
              {t("alreadyReported.message")}
            </p>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                {t("close")}
              </Button>
            </div>
          </div>
            );
          }
          return (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Type selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="reportType"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {t("typeLabel")} <span className="text-rose-500">*</span>
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="form-select"
              >
                {REPORT_TYPE_KEYS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 italic">
                {(() => {
                  const type = REPORT_TYPE_KEYS.find(
                    (item) => item.value === reportType,
                  );
                  return type ? t(type.descriptionKey) : null;
                })()}
              </p>
            </div>

            {/* Reason textarea */}
            <div className="space-y-1.5">
              <label
                htmlFor="reportReason"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {t("reasonLabel")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="reportReason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                maxLength={1000}
                className="form-textarea resize-none"
              />
              <div className="flex justify-end text-[11px] text-slate-400">
                {t("characterCount", { count: reason.length })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-slate-200"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </div>
          </form>
          );
        })()}
      </div>
    </div>
  );
}
