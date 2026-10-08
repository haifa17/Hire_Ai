"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { JobForm } from "@/components/job-offers/JobForm";
import { useCreateJobOffer } from "@/features/jobs/hooks/useJobOffers";
import type { JobOfferFormValues } from "@/features/jobs/schemas/jobOfferSchema";

export default function CreateRecruiterJobPage() {
  const t = useTranslations("recruiterDashboard.jobCreate");
  const router = useRouter();
  const createMutation = useCreateJobOffer();

  const handleCreate = async (values: JobOfferFormValues) => {
    await createMutation.mutateAsync({
      ...values,
      department: values.department || undefined,
      deadline: values.deadline || undefined,
      startDate: values.startDate || undefined,
      educationLevel: values.educationLevel || undefined,
    });
    router.push("/dashboard/recruiter/jobs");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-600">
          {t("subtitle")}
        </p>
      </div>

      <JobForm
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
