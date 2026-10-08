"use client";

import Link from "next/link";
import type { JobOffer } from "@/domain/models/JobOffer";
import { Button } from "@/components/ui/Button";
import { PublishButton } from "@/components/job-offers/PublishButton";

interface JobTableProps {
  jobs: JobOffer[];
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  privateDetailsBasePath?: string;
  applicationsBasePath?: string;
  interviewsBasePath?: string;
  editBasePath?: string;
  alwaysUsePrivateDetails?: boolean;
  showCompany?: boolean;
  showRecruiter?: boolean;
}

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

export function JobTable({
  jobs,
  onClose,
  onDelete,
  privateDetailsBasePath = "/dashboard/recruiter/jobs",
  applicationsBasePath = "/dashboard/recruiter/applicants",
  interviewsBasePath = "/dashboard/recruiter/interviews",
  editBasePath = "/dashboard/recruiter/jobs",
  alwaysUsePrivateDetails = false,
  showCompany = false,
  showRecruiter = false,
}: Readonly<JobTableProps>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Title</th>
            {showCompany ? <th className="px-4 py-3">Company</th> : null}
            {showRecruiter ? <th className="px-4 py-3">Recruiter</th> : null}
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Salary</th>
            <th className="px-4 py-3">Views</th>
            <th className="px-4 py-3">Applications</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {jobs.map((job) => {
            let statusBadgeClass = "bg-amber-100 text-amber-700";
            if (job.status === "PUBLISHED") {
              statusBadgeClass = "bg-emerald-100 text-emerald-700";
            } else if (job.status === "CLOSED") {
              statusBadgeClass = "bg-gray-200 text-gray-700";
            }
            const isPublished = job.status === "PUBLISHED";
            const applicationsHref = `${applicationsBasePath}?jobId=${encodeURIComponent(job.id)}`;
            const interviewsHref = `${interviewsBasePath}?jobOfferId=${encodeURIComponent(job.id)}`;

            return (
              <tr key={job.id}>
                <td className="min-w-56 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-xs text-gray-500">
                      {job.employmentType} • {job.workplaceType}
                    </p>
                  </div>
                </td>
                {showCompany ? (
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {job.company?.name ?? "-"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.company?.industry ?? ""}
                    </p>
                  </td>
                ) : null}
                {showRecruiter ? (
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {job.recruiter?.firstName ?? ""}{" "}
                      {job.recruiter?.lastName ?? ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.recruiter?.email ?? ""}
                    </p>
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {job.city}, {job.country}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(job.salaryMin, job.currency)} -{" "}
                  {formatMoney(job.salaryMax, job.currency)}
                </td>
                <td className="px-4 py-3">{job.views}</td>
                <td className="px-4 py-3">{job.applicationsCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`${privateDetailsBasePath}/${job.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Link href={applicationsHref}>
                      <Button variant="outline" size="sm">
                        Applications
                      </Button>
                    </Link>
                    <Link href={interviewsHref}>
                      <Button variant="outline" size="sm">
                        Interviews
                      </Button>
                    </Link>
                    <Link href={`${editBasePath}/${job.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    {isPublished ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClose(job.id)}
                      >
                        Close
                      </Button>
                    ) : (
                      <PublishButton jobOfferId={job.id} />
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(job.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
