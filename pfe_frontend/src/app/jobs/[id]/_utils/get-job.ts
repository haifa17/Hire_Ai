import { cache } from "react";
import { getPublicApiBaseUrl, getServerApiBaseUrl } from "@/lib/server-api";
import type { JobOffer } from "@/domain/models/JobOffer";

interface ApiEnvelope<T> {
  data: T;
}

/**
 * Fetches a published job offer on the server. Returns null when the backend
 * answers with a non-2xx status (unknown id, unpublished offer).
 *
 * Wrapped in `cache` so `generateMetadata` and the page share one request.
 */
export const getJobById = cache(async (id: string): Promise<JobOffer | null> => {
  // This fetch runs on the server (inside the frontend container under
  // Docker), so it uses the internal service URL; the logo URL below is
  // resolved by the browser and must stay on the public origin.
  const response = await fetch(
    `${getServerApiBaseUrl()}/api/v1/job-offers/public/${id}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ApiEnvelope<JobOffer>;
  const job = payload?.data ?? null;

  // Resolve relative image URLs to absolute backend URLs
  if (job?.company?.logoUrl?.startsWith("/")) {
    job.company.logoUrl = `${getPublicApiBaseUrl()}${job.company.logoUrl}`;
  }

  return job;
});
