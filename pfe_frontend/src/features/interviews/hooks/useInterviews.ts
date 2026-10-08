import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateInterviewPayload,
  Interview,
  UpdateInterviewPayload,
} from "@/domain/models/Interview";
import { interviewService } from "@/services/interviewService";

export const INTERVIEWS_QUERY_KEY = "interviews";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function useInterviewById(id: string) {
  return useQuery({
    queryKey: [INTERVIEWS_QUERY_KEY, id],
    queryFn: () => interviewService.getById(id),
    enabled: isUuid(id),
  });
}

export function useMyInterviews() {
  return useQuery({
    queryKey: [INTERVIEWS_QUERY_KEY, "mine"],
    queryFn: () => interviewService.getMine(),
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInterviewPayload) =>
      interviewService.create(payload),
    onSuccess: (interview) => {
      queryClient.setQueryData([INTERVIEWS_QUERY_KEY, interview.id], interview);
      queryClient.invalidateQueries({ queryKey: [INTERVIEWS_QUERY_KEY] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; data: UpdateInterviewPayload }) =>
      interviewService.update(payload.id, payload.data),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: [INTERVIEWS_QUERY_KEY, payload.id],
      });

      const previous = queryClient.getQueryData([
        INTERVIEWS_QUERY_KEY,
        payload.id,
      ]);

      queryClient.setQueryData(
        [INTERVIEWS_QUERY_KEY, payload.id],
        (current: Interview | undefined) =>
          current ? { ...current, ...payload.data } : current,
      );

      return { previous };
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [INTERVIEWS_QUERY_KEY, payload.id],
          context.previous,
        );
      }
    },
    onSuccess: (interview) => {
      queryClient.setQueryData([INTERVIEWS_QUERY_KEY, interview.id], interview);
      queryClient.invalidateQueries({ queryKey: [INTERVIEWS_QUERY_KEY] });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => interviewService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: [INTERVIEWS_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [INTERVIEWS_QUERY_KEY] });
    },
  });
}
