"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import Panel from "@/components/applications/Panel";
import ApplicationTimeline from "@/components/applications/ApplicationTimeline";
import DocumentList from "@/components/applications/DocumentList";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import {
  User,
  Briefcase,
  MapPin,
  CalendarDays,
  Loader2,
  Mail,
  ShieldCheck,
  ChevronRight,
  FileText,
  ExternalLink,
  Download,
} from "lucide-react";
import { resolveUploadUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ApplicationHeader } from "@/components/applications/ApplicationHeader";
import { AiInsightsPanel, type MatchAnalysis } from "@/components/applications/AiInsightsPanel";

// TypeScript model declarations
interface RecruiterResponse {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  photoUrl?: string;
  position?: string;
  recruiterProfile?: {
    position?: string;
  };
}

interface JobOfferResponse {
  title?: string;
  employmentType?: string;
  location?: string;
  city?: string;
  company?: {
    name?: string;
  };
  recruiter?: RecruiterResponse;
}

interface ApplicationResponse {
  id: string;
  status?: string;
  createdAt?: string;
  coverLetter?: string | null;
  coverLetterUrl?: string | null;
  coverLetterMetadata?: { originalName?: string; size?: number } | null;
  aiAnalysis?: MatchAnalysis;
  jobOffer?: JobOfferResponse;
  cvUrl?: string;
  cvMetadata?: { originalName?: string } | null;
  supportingDocuments?: Array<{
    originalName?: string;
    url?: string;
    size?: number;
  }>;
}

export default function ApplicationDetailsPage() {
  const t = useTranslations("candidateDashboard.applicationDetail");
  const router = useRouter();
  const params = useParams() as { id?: string };
  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    const startLoading = () => setLoading(true);
    startLoading();
    api
      .get(`/applications/${id}`)
      .then((res) => setApplication(res.data?.data ?? res.data))
      .catch((err) => toast.error(err?.response?.data?.message || err.message || t("genericError")))
      .finally(() => setLoading(false));
  }, [params?.id]);

  useEffect(() => {
    const id = params?.id;
    if (!id || !application || application.aiAnalysis) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/applications/${id}`);
        const freshApp = res.data?.data ?? res.data;
        if (freshApp?.aiAnalysis) {
          setApplication(freshApp);
        }
      } catch (err) {
        console.error("Error polling AI match score:", err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [params?.id, application?.aiAnalysis, application]);

  const handleWithdraw = async () => {
    if (!application) return;
    if (!confirm(t("confirmWithdraw"))) return;

    try {
      await api.delete(`/applications/${application.id}`);
      toast.success(t("withdrawSuccess"));
      router.push("/dashboard/candidate/applications");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(axiosError?.response?.data?.message || axiosError.message || t("genericError"));
    }
  };

  const handleMessageRecruiter = () => {
    toast(t("conversationsComingSoon"), {
      icon: "💬",
    });
  };

  // Structured loader with premium skeletal flow
  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
        <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center" aria-hidden="true">
          <div className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }} />
        </div>
        <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
          <div className="flex flex-col gap-4 border-b border-slate-200/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-8 w-64 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 rounded bg-slate-200" />
              <div className="h-10 w-32 rounded bg-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="h-48 rounded-3xl bg-slate-200/60" />
              <div className="h-64 rounded-3xl bg-slate-200/60" />
            </div>
            <div className="space-y-6">
              <div className="h-40 rounded-3xl bg-slate-200/60" />
              <div className="h-40 rounded-3xl bg-slate-200/60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found/unauthorized state
  if (!application) {
    return (
      <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-8 text-center shadow-xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 shadow-sm mb-5">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t("unavailableTitle")}</h2>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {t("unavailableMessage")}
          </p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => router.push("/dashboard/candidate/applications")} className="w-full cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200">
              {t("returnToApplications")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const job = application.jobOffer ?? {};
  const companyName = job.company?.name ?? t("unknownCompany");
  const recruiter = job.recruiter;

  const recruiterFullName =
    `${recruiter?.firstName ?? ""} ${recruiter?.lastName ?? ""}`.trim() ||
    t("recruiterProfile");
  const recruiterPosition =
    recruiter?.position ?? recruiter?.recruiterProfile?.position ?? t("hrRepresentative");
  const recruiterAvatar = resolveUploadUrl(recruiter?.avatarUrl ?? recruiter?.photoUrl);

  const aiScore = (() => {
    const a = application?.aiAnalysis;
    if (a && typeof a === "object") {
      const record = a as Record<string, unknown>;
      const v =
        record.matchPercentage ??
        record.matchScore ??
        record.overallMatch ??
        record.score ??
        record.atsScore ??
        record.globalScore;
      if (typeof v === "number")
        return Math.round(Math.max(0, Math.min(100, v)));
      if (typeof v === "string") return Math.round(Number.parseFloat(v) || 0);
    }
    return null;
  })();

  const timelineSteps = [
    { key: "applied", label: t("timeline.applied"), active: true },
    {
      key: "reviewed",
      label: t("timeline.reviewed"),
      active: application.status !== "PENDING",
    },
    {
      key: "interview",
      label: t("timeline.interview"),
      active:
        application.status === "INTERVIEW" || application.status === "ACCEPTED",
    },
    { key: "offer", label: t("timeline.offer"), active: application.status === "ACCEPTED" },
  ];

  const documents = [] as Array<{ id: string; name: string; url?: string }>;
  if (application.cvUrl) {
    documents.push({
      id: "cv",
      name: application.cvMetadata?.originalName ?? t("resumeCvFileName"),
      url: resolveUploadUrl(application.cvUrl),
    });
  }

  (application.supportingDocuments ?? []).forEach((supportingDoc, idx) => {
    documents.push({
      id: `supporting-${idx}`,
      name: supportingDoc.originalName ?? t("supportingDocumentName", { index: idx + 1 }),
      url: resolveUploadUrl(supportingDoc.url),
    });
  });

  return (
    <div className="relative min-h-screen bg-slate-50/70 px-4 py-8 sm:px-6 lg:px-8 overflow-hidden pb-16">
      {/* Background glow visual decorators */}
      <div
        className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl justify-center"
        aria-hidden="true"
      >
        <div
          className="aspect-[1155/678] w-[72.1875rem] flex-none bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-20"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Modular application header */}
        <ApplicationHeader
          title={job.title ?? t("jobApplicationDetails")}
          companyName={companyName}
          status={application.status}
          onBack={() => router.back()}
          onWithdraw={handleWithdraw}
          onMessage={handleMessageRecruiter}
        />

        {/* Dynamic column system */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          
          {/* Main timeline and documents column */}
          <div className="space-y-6">
            
            {/* Journey Timeline */}
            <Panel className="relative overflow-hidden bg-white/80 backdrop-blur-md transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {t("applicationJourney")}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {t("applicationJourneySubtitle")}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto pb-2 flex items-center justify-start min-h-[72px]">
                <ApplicationTimeline steps={timelineSteps} />
              </div>
            </Panel>

            {/* Modular AI Insights Panel */}
            {aiScore !== null ? (
              <AiInsightsPanel score={aiScore} analysis={application.aiAnalysis} />
            ) : (
              <Panel className="relative overflow-hidden bg-white/80 backdrop-blur-md p-8 text-center border border-slate-200/50 shadow-md">
                {/* Decorative AI Glow Element */}
                <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
                
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-indigo-400/20 blur-md animate-ping" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-650 shadow-xs">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">{t("aiMatchComputing")}</h4>
                    <p className="text-xs font-semibold text-slate-550 leading-relaxed">
                      {t("aiMatchComputingHint")}
                    </p>
                  </div>
                </div>
              </Panel>
            )}

            {/* Submitted Documents Panel */}
            <Panel className="bg-white/80 backdrop-blur-md transition-all duration-300 hover:shadow-md">
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {t("submittedDocuments")}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {t("submittedDocumentsSubtitle")}
                </p>
              </div>
              <div className="mt-2">
                <DocumentList
                  docs={documents.map((d) => ({
                    id: d.id,
                    name: d.name,
                    url: d.url,
                  }))}
                />
              </div>
            </Panel>

            {/* Cover Letter Panel */}
            {application.coverLetter || application.coverLetterUrl ? (
              <Panel className="bg-white/80 backdrop-blur-md transition-all duration-300 hover:shadow-md">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {t("coverLetter")}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {t("coverLetterSubtitle")}
                  </p>
                </div>
                {(() => {
                  const coverUrl =
                    application.coverLetterUrl ||
                    (application.coverLetter?.startsWith("/uploads")
                      ? application.coverLetter
                      : null);

                  if (coverUrl) {
                    const resolved = resolveUploadUrl(coverUrl);
                    const fileName =
                      application.coverLetterMetadata?.originalName ??
                      t("coverLetterFileName");
                    return (
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {fileName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t("pdfDocument")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolved}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t("viewPdf")}
                          </a>
                          <a
                            href={resolved}
                            download
                            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title={t("downloadPdf")}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-sm leading-7 text-slate-700 font-medium">
                      {application.coverLetter}
                    </div>
                  );
                })()}
              </Panel>
            ) : null}
          </div>

          {/* Sidebar components */}
          <aside className="space-y-6">
            
            {/* Recruiter / Interview Team Widget */}
            <Panel className="relative overflow-hidden bg-white/80 backdrop-blur-md transition-all duration-300 hover:shadow-md">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {t("interviewTeam")}
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {t("interviewTeamSubtitle")}
                </p>
              </div>

              <div className="mt-2">
                {recruiter ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs overflow-hidden">
                        {recruiterAvatar ? (
                          <Image
                            src={recruiterAvatar}
                            alt={recruiterFullName}
                            fill
                            unoptimized
                            className="object-cover rounded-2xl"
                          />
                        ) : (
                          <User className="h-5 w-5 text-indigo-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {recruiterFullName}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                          {recruiterPosition}
                        </div>
                      </div>
                    </div>

                    {recruiter.email && (
                      <a
                        href={`mailto:${recruiter.email}`}
                        className="group flex items-center justify-between rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-150/60 hover:border-indigo-100/50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:text-indigo-700 transition-all duration-200 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          <span>{t("contactRecruiter")}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50/50 border border-slate-100/60 p-4 text-xs font-semibold text-slate-500 leading-relaxed italic">
                    {t("recruiterPending")}
                  </div>
                )}
              </div>
            </Panel>

            {/* Quick Facts Widget */}
            <Panel className="bg-white/80 backdrop-blur-md transition-all duration-300 hover:shadow-md">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {t("jobQuickFacts")}
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {t("jobQuickFactsSubtitle")}
                </p>
              </div>

              <div className="mt-2 space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{t("employmentType")}: <span className="text-slate-800 font-extrabold">{job.employmentType ?? t("fullTime")}</span></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{t("location")}: <span className="text-slate-800 font-extrabold">{job.location ?? job.city ?? t("remote")}</span></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    {t("appliedOnLabel")}{" "}
                    <span className="text-slate-800 font-extrabold">
                      {application.createdAt
                        ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(application.createdAt))
                        : "-"}
                    </span>
                  </span>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
