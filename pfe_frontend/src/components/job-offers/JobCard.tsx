"use client";

import Link from "next/link";
import { Briefcase, CalendarDays, MapPin, TrendingUp } from "lucide-react";
import type { JobOffer } from "@/domain/models/JobOffer";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function formatMoney(value?: string | number | null, currency = "USD") {
  if (value === null || value === undefined || value === "") return "-";
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface JobCardProps {
  job: JobOffer;
  onClose?: (id: string) => void;
  privateDetailsBasePath?: string;
  applicationsBasePath?: string;
  interviewsBasePath?: string;
  alwaysUsePrivateDetails?: boolean;
  showCompany?: boolean;
  showRecruiter?: boolean;
}

export function JobCard({
  job,
  onClose,
  privateDetailsBasePath = "/dashboard/recruiter/jobs",
  applicationsBasePath = "/dashboard/recruiter/applicants",
  interviewsBasePath = "/dashboard/recruiter/interviews",
  alwaysUsePrivateDetails = false,
  showCompany = false,
  showRecruiter = false,
}: Readonly<JobCardProps>) {
  const applicationsHref = `${applicationsBasePath}?jobId=${encodeURIComponent(job.id)}`;
  const interviewsHref = `${interviewsBasePath}?jobOfferId=${encodeURIComponent(job.id)}`;
  let statusBadgeClass = "bg-amber-100 text-amber-700";

  if (job.status === "PUBLISHED") {
    statusBadgeClass = "bg-emerald-100 text-emerald-700";
  } else if (job.status === "CLOSED") {
    statusBadgeClass = "bg-gray-200 text-gray-700";
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
            {showCompany ? (
              <p className="mt-1 text-sm text-gray-600">
                {job.company?.name ?? "My Company"}
              </p>
            ) : null}
            {showRecruiter ? (
              <p className="mt-1 text-sm text-gray-500">
                Posted by {job.recruiter?.firstName ?? ""}{" "}
                {job.recruiter?.lastName ?? ""}
              </p>
            ) : null}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}
          >
            {job.status}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-gray-600">
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {job.city}, {job.country} • {job.workplaceType}
          </p>
          <p className="inline-flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {job.employmentType}
          </p>
          <p className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </p>
          <p className="inline-flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Views {job.views} • Applications {job.applicationsCount}
          </p>
        </div>

        <p className="mt-3 text-sm font-medium text-gray-800">
          {formatMoney(job.salaryMin, job.currency)} -{" "}
          {formatMoney(job.salaryMax, job.currency)}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <Link
            href={
              job.status === "PUBLISHED" && !alwaysUsePrivateDetails
                ? `/jobs/${job.id}`
                : `${privateDetailsBasePath}/${job.id}`
            }
            className="inline-flex"
          >
            <Button variant="outline" size="sm">
              {job.status === "PUBLISHED" && !alwaysUsePrivateDetails
                ? "View Public"
                : "View"}
            </Button>
          </Link>
          <Link href={applicationsHref} className="inline-flex">
            <Button variant="outline" size="sm">
              View applications
            </Button>
          </Link>
          <Link href={interviewsHref} className="inline-flex">
            <Button variant="outline" size="sm">
              Interviews
            </Button>
          </Link>
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={() => onClose(job.id)}>
              Close
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
