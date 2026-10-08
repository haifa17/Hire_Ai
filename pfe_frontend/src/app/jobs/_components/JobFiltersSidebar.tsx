import { useTranslations } from 'next-intl';
import { Filter } from 'lucide-react';
import type { JobEmploymentType, JobWorkplaceType } from '@/domain/models/JobOffer';
import {
  EMPLOYMENT_TYPE_VALUES,
  WORKPLACE_TYPE_VALUES,
  formatEmploymentType,
  formatWorkplaceType,
} from '../_utils/job-list-helpers';

interface CheckboxGroupProps<T extends string> {
  title: string;
  options: T[];
  selected: T[];
  getLabel: (option: T) => string;
  onToggle: (option: T) => void;
}

function CheckboxGroup<T extends string>({
  title,
  options,
  selected,
  getLabel,
  onToggle,
}: Readonly<CheckboxGroupProps<T>>) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">{title}</p>
      <div className="space-y-2.5">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:text-slate-900 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 transition-all"
            />
            <span className="font-medium">{getLabel(option)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface JobFiltersSidebarProps {
  employmentTypes: JobEmploymentType[];
  workplaceTypes: JobWorkplaceType[];
  onToggleEmploymentType: (type: JobEmploymentType) => void;
  onToggleWorkplaceType: (type: JobWorkplaceType) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

export function JobFiltersSidebar({
  employmentTypes,
  workplaceTypes,
  onToggleEmploymentType,
  onToggleWorkplaceType,
  hasActiveFilters,
  onReset,
}: Readonly<JobFiltersSidebarProps>) {
  const t = useTranslations('publicJobs.list');

  return (
    <aside className="w-full md:w-64 shrink-0 space-y-6 hidden md:block">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" /> {t('sidebar.title')}
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              {t('sidebar.reset')}
            </button>
          )}
        </div>

        <div className="space-y-6">
          <CheckboxGroup
            title={t('sidebar.jobType')}
            options={EMPLOYMENT_TYPE_VALUES}
            selected={employmentTypes}
            getLabel={(type) => formatEmploymentType(t, type)}
            onToggle={onToggleEmploymentType}
          />
          <div className="pt-4 border-t border-slate-100">
            <CheckboxGroup
              title={t('sidebar.workModel')}
              options={WORKPLACE_TYPE_VALUES}
              selected={workplaceTypes}
              getLabel={(type) => formatWorkplaceType(t, type)}
              onToggle={onToggleWorkplaceType}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
