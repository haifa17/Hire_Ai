"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { ReportJobModal } from "@/components/job-offers/ReportJobModal";
import type { JobOffer } from "@/domain/models/JobOffer";

interface JobDetailsActionsProps {
  job: JobOffer;
  editHref?: string;
}

export function JobDetailsActions({
  job,
  editHref,
}: Readonly<JobDetailsActionsProps>) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isRecruiterOrAdmin =
    isAuthenticated && (user?.role === "RECRUITER" || user?.role === "ADMIN");
  const isJobOwner =
    isRecruiterOrAdmin &&
    (user?.id === job.recruiterId || user?.role === "ADMIN");

  const isOwnJob = user?.id === job.recruiterId;

  const handleApply = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role === "RECRUITER") {
      return;
    }
    router.push(`/dashboard/candidate/apply?jobId=${job.id}`);
  };

  const handleOpenReport = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setIsReportModalOpen(true);
  };

  return (
    <div className="space-y-3 pt-2">
      {isJobOwner ? (
        <Link href={editHref ?? `/dashboard/recruiter/jobs/${job.id}/edit`}>
          <Button className="w-full" variant="primary">
            Edit Job Offer
          </Button>
        </Link>
      ) : (
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          onClick={handleApply}
          disabled={user?.role === "RECRUITER"}
        >
          {isAuthenticated ? "Apply Now" : "Sign In to Apply"}
        </Button>
      )}

      {/* Report Button */}
      {!isOwnJob && (
        <Button
          variant="outline"
          className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors flex items-center justify-center gap-2"
          onClick={handleOpenReport}
        >
          <Flag className="h-4 w-4 text-rose-600" />
          <span>Signaler cette offre</span>
        </Button>
      )}

      <ReportJobModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        jobOfferId={job.id}
        jobTitle={job.title}
        recruiterId={job.recruiterId}
      />
    </div>
  );
}
