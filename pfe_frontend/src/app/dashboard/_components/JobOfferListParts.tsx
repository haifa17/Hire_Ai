import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { JobOfferListResponse } from "@/domain/models/JobOffer";

export type JobViewMode = "table" | "cards";

const SKELETON_ROWS = ["s-1", "s-2", "s-3", "s-4"];

export function JobOfferListSkeleton() {
  return (
    <div className="grid gap-3">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="h-24 animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  );
}

type JobOfferListEmptyProps = {
  title: string;
  description: string;
  /** Optional call to action, e.g. "Create job offer". */
  children?: ReactNode;
};

export function JobOfferListEmpty({
  title,
  description,
  children,
}: JobOfferListEmptyProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      {children}
    </div>
  );
}

type ViewModeToggleProps = {
  value: JobViewMode;
  onChange: (mode: JobViewMode) => void;
  labels: Record<JobViewMode, string>;
};

export function ViewModeToggle({ value, onChange, labels }: ViewModeToggleProps) {
  const modes: JobViewMode[] = ["table", "cards"];

  return (
    <div className="flex items-center justify-end gap-2">
      {modes.map((mode) => (
        <Button
          key={mode}
          variant={value === mode ? "primary" : "outline"}
          size="sm"
          onClick={() => onChange(mode)}
        >
          {labels[mode]}
        </Button>
      ))}
    </div>
  );
}

type JobOfferPaginationProps = {
  pagination: JobOfferListResponse["pagination"];
  summary: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function JobOfferPagination({
  pagination,
  summary,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: JobOfferPaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
      <p className="text-gray-600">{summary}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPrevious}
          onClick={onPrevious}
        >
          {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNext}
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
