import { useMutation } from "@tanstack/react-query";
import { offerMatchService } from "@/services/offerMatchService";
import type { MatchOfferRequest } from "@/domain/models/OfferMatch";

/** Scores the signed-in candidate's profile against one offer. Not cached: each run is a fresh analysis. */
export function useMatchOffer() {
  return useMutation({
    mutationFn: (request: MatchOfferRequest) =>
      offerMatchService.matchOffer(request),
  });
}
