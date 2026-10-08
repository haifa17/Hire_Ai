import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getApplyUrl } from "../_utils/job-list-helpers";
import { JobContent } from "./_components/JobContent";
import { JobHero } from "./_components/JobHero";
import { JobSidebar } from "./_components/JobSidebar";
import { getJobById } from "./_utils/get-job";

const META_DESCRIPTION_LENGTH = 160;

interface JobDetailsPageProps {
  readonly params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: JobDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);
  const t = await getTranslations("publicJobs.detail");

  if (!job) {
    return {
      title: t("notFound.title"),
      description: t("notFound.description"),
    };
  }

  return {
    title: `${job.title} at ${job.company?.name ?? t("unknownCompany")} | TalentBridge AI`,
    description: job.description.slice(0, META_DESCRIPTION_LENGTH),
  };
}

export default async function JobDetailsPage({
  params,
}: Readonly<JobDetailsPageProps>) {
  const { id } = await params;
  const job = await getJobById(id);
  const t = await getTranslations("publicJobs.detail");

  if (!job) {
    notFound();
  }

  const applyHref = getApplyUrl(job.id);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/jobs" className="group">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-200 bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t("back.toJobs")}
            </Button>
          </Link>
        </div>

        <JobHero job={job} applyHref={applyHref} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <JobContent job={job} />
          <JobSidebar job={job} applyHref={applyHref} />
        </div>
      </div>
    </div>
  );
}
