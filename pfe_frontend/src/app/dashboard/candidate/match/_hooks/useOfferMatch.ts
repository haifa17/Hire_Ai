import { useState } from "react";
import { useLocale } from "next-intl";
import { usePublicJobOfferById } from "@/features/jobs/hooks/useJobOffers";
import { useMatchOffer } from "@/features/matching/hooks/useMatchOffer";
import type { JobOffer } from "@/domain/models/JobOffer";
import type { ExternalOffer, MatchOfferRequest } from "@/domain/models/OfferMatch";

export type OfferSource = "platform" | "external";

/** Mirrors the backend's MinLength on externalOffer.description. */
export const MIN_DESCRIPTION_LENGTH = 80;

const EMPTY_EXTERNAL_OFFER: ExternalOffer = {
  title: "",
  company: "",
  location: "",
  description: "",
};

/**
 * State of the "match an offer" page. `initialJobId` (from `?jobId=`)
 * preselects a platform offer, e.g. when coming from a job detail page.
 */
export function useOfferMatch(initialJobId: string) {
  const locale = useLocale();
  const match = useMatchOffer();

  const [source, setSource] = useState<OfferSource>("platform");

  // The preselected offer is fetched once; picking another one, or clearing
  // the selection, takes precedence over it.
  const preselected = usePublicJobOfferById(initialJobId);
  const [pickedJob, setPickedJob] = useState<JobOffer | null>(null);
  const [isPreselectionCleared, setIsPreselectionCleared] = useState(false);
  const selectedJob =
    pickedJob ?? (isPreselectionCleared ? null : (preselected.data ?? null));

  const [externalOffer, setExternalOffer] = useState<ExternalOffer>(EMPTY_EXTERNAL_OFFER);

  const changeSource = (next: OfferSource) => {
    setSource(next);
    match.reset();
  };

  const selectJob = (job: JobOffer | null) => {
    setPickedJob(job);
    setIsPreselectionCleared(job === null);
    match.reset();
  };

  const updateExternalOffer = (field: keyof ExternalOffer, value: string) => {
    setExternalOffer((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit =
    source === "platform"
      ? Boolean(selectedJob)
      : externalOffer.title.trim().length > 0 &&
        externalOffer.description.trim().length >= MIN_DESCRIPTION_LENGTH;

  const submit = () => {
    if (!canSubmit || match.isPending) return;

    const language = locale === "fr" ? "fr" : "en";
    const request: MatchOfferRequest =
      source === "platform"
        ? { jobOfferId: selectedJob?.id, language }
        : {
            externalOffer: {
              title: externalOffer.title.trim(),
              company: externalOffer.company?.trim() || undefined,
              location: externalOffer.location?.trim() || undefined,
              description: externalOffer.description.trim(),
            },
            language,
          };

    match.mutate(request);
  };

  return {
    source,
    changeSource,
    selectedJob,
    isLoadingPreselection: Boolean(initialJobId) && preselected.isLoading,
    selectJob,
    externalOffer,
    updateExternalOffer,
    canSubmit,
    submit,
    isMatching: match.isPending,
    error: match.error,
    response: match.data,
    reset: match.reset,
  };
}
