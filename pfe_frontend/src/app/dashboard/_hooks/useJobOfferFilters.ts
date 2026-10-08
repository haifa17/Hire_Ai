import { useState } from "react";
import type { JobOfferFilters } from "@/domain/models/JobOffer";
import type { JobViewMode } from "../_components/JobOfferListParts";

const INITIAL_FILTERS: JobOfferFilters = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

/** Filter, paging and view-mode state of a dashboard job offer list. */
export function useJobOfferFilters() {
  const [filters, setFilters] = useState<JobOfferFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<JobViewMode>("table");

  return {
    filters,
    setFilters,
    resetFilters: () => setFilters(INITIAL_FILTERS),
    goToPreviousPage: () =>
      setFilters((current) => ({
        ...current,
        page: Math.max(1, (current.page ?? 1) - 1),
      })),
    goToNextPage: () =>
      setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 })),
    viewMode,
    setViewMode,
  };
}
