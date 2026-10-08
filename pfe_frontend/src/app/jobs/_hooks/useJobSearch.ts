import { useMemo, useState } from 'react';
import { usePublicJobOffers } from '@/features/jobs/hooks/useJobOffers';
import { PAGE_SIZE } from '../_utils/job-list-helpers';
import type {
  JobEmploymentType,
  JobOfferFilters,
  JobOfferListResponse,
  JobWorkplaceType,
} from '@/domain/models/JobOffer';

export type JobSortOption = 'newest' | 'oldest';

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Owns the search/filter/sort/pagination state of the public job board and
 * the query derived from it. Any change to the criteria resets to page 1.
 *
 * `initialData` is the server-rendered first page; it only seeds the query
 * while the criteria are still the defaults it was fetched with.
 */
export function useJobSearch(initialData?: JobOfferListResponse) {
  const [page, setPage] = useState(1);

  // Text inputs are drafts: they only reach the query once the form is submitted.
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');

  const [employmentTypes, setEmploymentTypes] = useState<JobEmploymentType[]>([]);
  const [workplaceTypes, setWorkplaceTypes] = useState<JobWorkplaceType[]>([]);
  const [sortOption, setSortOption] = useState<JobSortOption>('newest');

  // The API accepts a single value per type filter. One selection is sent to
  // the server; several are narrowed client-side on the current page (below).
  const filters: JobOfferFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: appliedSearch.trim() || undefined,
      city: appliedLocation.trim() || undefined,
      employmentType: employmentTypes.length === 1 ? employmentTypes[0] : undefined,
      workplaceType: workplaceTypes.length === 1 ? workplaceTypes[0] : undefined,
      sortBy: 'createdAt',
      sortOrder: sortOption === 'newest' ? 'desc' : 'asc',
    }),
    [page, appliedSearch, appliedLocation, employmentTypes, workplaceTypes, sortOption]
  );

  const isDefaultQuery =
    page === 1 &&
    sortOption === 'newest' &&
    !filters.search &&
    !filters.city &&
    employmentTypes.length === 0 &&
    workplaceTypes.length === 0;

  const { data, isLoading, isError } = usePublicJobOffers(
    filters,
    isDefaultQuery ? initialData : undefined
  );

  const jobs = useMemo(() => {
    let list = data?.items ?? [];
    if (employmentTypes.length > 1) {
      list = list.filter((job) => employmentTypes.includes(job.employmentType));
    }
    if (workplaceTypes.length > 1) {
      list = list.filter((job) => workplaceTypes.includes(job.workplaceType));
    }
    return list;
  }, [data, employmentTypes, workplaceTypes]);

  const pagination = data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  const submitSearch = () => {
    setAppliedSearch(searchInput);
    setAppliedLocation(locationInput);
    setPage(1);
  };

  const toggleEmploymentType = (type: JobEmploymentType) => {
    setEmploymentTypes((prev) => toggleValue(prev, type));
    setPage(1);
  };

  const toggleWorkplaceType = (type: JobWorkplaceType) => {
    setWorkplaceTypes((prev) => toggleValue(prev, type));
    setPage(1);
  };

  const changeSort = (option: JobSortOption) => {
    setSortOption(option);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setLocationInput('');
    setAppliedSearch('');
    setAppliedLocation('');
    setEmploymentTypes([]);
    setWorkplaceTypes([]);
    setPage(1);
  };

  return {
    jobs,
    isLoading,
    isError,

    searchInput,
    setSearchInput,
    locationInput,
    setLocationInput,
    submitSearch,

    employmentTypes,
    toggleEmploymentType,
    workplaceTypes,
    toggleWorkplaceType,

    sortOption,
    changeSort,

    hasActiveFilters:
      appliedSearch.length > 0 ||
      appliedLocation.length > 0 ||
      employmentTypes.length > 0 ||
      workplaceTypes.length > 0,
    clearFilters,

    page,
    setPage,
    totalItems: pagination?.total ?? 0,
    totalPages,
    hasPrevious: pagination?.hasPrevious ?? page > 1,
    hasNext: pagination?.hasNext ?? page < totalPages,
  };
}
