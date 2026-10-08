"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { JobOfferFilters } from "@/domain/models/JobOffer";

interface JobFiltersProps {
  filters: JobOfferFilters;
  onChange: (filters: JobOfferFilters) => void;
  onReset: () => void;
}

export function JobFilters({ filters, onChange, onReset }: JobFiltersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search title or location"
          value={filters.search ?? ""}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value, page: 1 })
          }
        />

        <select
          className="form-select w-auto"
          value={filters.status ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as JobOfferFilters["status"],
              page: 1,
            })
          }
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          className="form-select w-auto"
          value={filters.workplaceType ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              workplaceType: event.target
                .value as JobOfferFilters["workplaceType"],
              page: 1,
            })
          }
        >
          <option value="">All workplace</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">Onsite</option>
        </select>

        <select
          className="form-select w-auto"
          value={filters.sortBy ?? "createdAt"}
          onChange={(event) =>
            onChange({
              ...filters,
              sortBy: event.target.value as JobOfferFilters["sortBy"],
            })
          }
        >
          <option value="createdAt">Sort by date</option>
          <option value="views">Sort by views</option>
          <option value="salaryMin">Sort by salary</option>
        </select>

        <select
          className="form-select w-auto"
          value={filters.sortOrder ?? "desc"}
          onChange={(event) =>
            onChange({
              ...filters,
              sortOrder: event.target.value as JobOfferFilters["sortOrder"],
            })
          }
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
