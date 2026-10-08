"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { JobForm } from "@/components/job-offers/JobForm";
import {
  useJobOfferById,
  useUpdateJobOffer,
} from "@/features/jobs/hooks/useJobOffers";
import type { JobOfferFormValues } from "@/features/jobs/schemas/jobOfferSchema";
import { toJobFormValues } from "../_utils/job-form-values";

export type JobEditLabels = {
  loading: string;
  notFound: string;
  title: string;
  subtitle: string;
};

type JobEditViewProps = {
  labels: JobEditLabels;
  /** Where to go once the offer is saved. */
  redirectTo: string;
};

/** Edit-job page shared by the admin and recruiter dashboards. */
export function JobEditView({ labels, redirectTo }: JobEditViewProps) {
  const params = useParams() as { id?: string };
  const id = params?.id ?? "";
  const router = useRouter();

  const query = useJobOfferById(id);
  const updateMutation = useUpdateJobOffer();

  const initialValues = useMemo(
    () => (query.data ? toJobFormValues(query.data) : undefined),
    [query.data],
  );

  const handleUpdate = async (values: JobOfferFormValues) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        ...values,
        educationLevel:
          values.educationLevel === "" ? undefined : values.educationLevel,
      },
    });
    router.push(redirectTo);
  };

  if (query.isLoading) {
    return <div className="p-4">{labels.loading}</div>;
  }

  if (!query.data) {
    return <div className="p-4">{labels.notFound}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
        <p className="text-sm text-gray-600">{labels.subtitle}</p>
      </div>

      <JobForm
        initialValues={initialValues}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
