import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobOfferService } from "@/services/jobOfferService";
import type {
  JobOfferFilters,
  JobOfferFormPayload,
  JobOfferListResponse,
} from "@/domain/models/JobOffer";

export const JOB_OFFERS_QUERY_KEY = "job-offers";

export function useMyCompanyJobOffers(filters: JobOfferFilters) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "company", filters],
    queryFn: () => jobOfferService.listMyCompany(filters),
  });
}

export function usePublicJobOffers(
  filters: JobOfferFilters,
  initialData?: JobOfferListResponse,
) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "public", filters],
    queryFn: () => jobOfferService.listPublic(filters),
    initialData,
  });
}

export function useAdminJobOffers(filters: JobOfferFilters) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "admin", filters],
    queryFn: () => jobOfferService.listAdmin(filters),
  });
}

export function useJobOfferBySlug(slug: string) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "slug", slug],
    queryFn: () => jobOfferService.getBySlug(slug),
    enabled: slug.length > 0,
  });
}

export function useCreateJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobOfferFormPayload) =>
      jobOfferService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [JOB_OFFERS_QUERY_KEY, "company"],
      });
    },
  });
}

export function usePublishJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobOfferService.publish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [JOB_OFFERS_QUERY_KEY] });
    },
  });
}

export function useCloseJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobOfferService.close(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [JOB_OFFERS_QUERY_KEY] });
    },
  });
}

export function useDeleteJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobOfferService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [JOB_OFFERS_QUERY_KEY] });
    },
  });
}

export function useAiGenerateJobOffer() {
  return useMutation({
    mutationFn: (prompt: string) => jobOfferService.aiGenerate(prompt),
  });
}

export function useJobOfferById(id: string) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "id", id],
    queryFn: () => jobOfferService.getById(id),
    enabled: !!id,
  });
}

export function usePublicJobOfferById(id: string) {
  return useQuery({
    queryKey: [JOB_OFFERS_QUERY_KEY, "public", "id", id],
    queryFn: () => jobOfferService.getPublicById(id),
    enabled: !!id,
  });
}

export function useUpdateJobOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<JobOfferFormPayload> }) =>
      jobOfferService.update(payload.id, payload.data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [JOB_OFFERS_QUERY_KEY, "company"],
      });
      void queryClient.invalidateQueries({
        queryKey: [JOB_OFFERS_QUERY_KEY, "id", variables.id],
      });
    },
  });
}
