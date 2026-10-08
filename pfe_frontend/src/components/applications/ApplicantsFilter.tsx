import React from "react";
import { Search, Filter } from "lucide-react";
import { Select } from "@/components/ui/Select";

export type ApplicationStatus =
  | "PENDING"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

export const APPLICATION_STATUS_OPTIONS: ApplicationStatus[] = [
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
];

interface ApplicantsFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: ApplicationStatus | "ALL";
  setStatusFilter: (status: ApplicationStatus | "ALL") => void;
  statusCounts: Record<ApplicationStatus | "ALL", number>;
}

export const ApplicantsFilter: React.FC<ApplicantsFilterProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusCounts,
}) => {
  // Format options with dynamic counts
  const options = React.useMemo(() => {
    return [
      {
        value: "ALL",
        label: `All States (${statusCounts.ALL})`,
      },
      ...APPLICATION_STATUS_OPTIONS.map((opt) => ({
        value: opt,
        label: `${opt.charAt(0) + opt.slice(1).toLowerCase()} (${statusCounts[opt] || 0})`,
      })),
    ];
  }, [statusCounts]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/40 pb-4">
      {/* Search Box */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search applicants by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input pl-11 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors bg-slate-100/80 hover:bg-slate-200 rounded-lg px-1.5 py-0.5 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Modern Status Filter Dropdown Select */}
      <div className="relative w-full sm:w-64 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center shrink-0 rounded-2xl bg-indigo-50/80 border border-indigo-100/50 text-indigo-600 shadow-2xs backdrop-blur-xs">
          <Filter className="h-5 w-5" />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "ALL")}
          options={options}
        />
      </div>
    </div>
  );
};
