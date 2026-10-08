import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const SKELETON_ROWS = [1, 2, 3];

export function JobListSkeleton() {
  return (
    <div className="space-y-4">
      {SKELETON_ROWS.map((row) => (
        <div
          key={row}
          className="animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-48 rounded-md bg-slate-200" />
              <div className="h-4 w-32 rounded-md bg-slate-100" />
              <div className="flex gap-4 pt-2">
                <div className="h-4 w-24 rounded-md bg-slate-100" />
                <div className="h-4 w-24 rounded-md bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function JobListError() {
  const t = useTranslations('publicJobs.list');

  return (
    <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
      <p className="text-sm font-semibold text-rose-500">{t('error.failedToLoad')}</p>
    </div>
  );
}

interface JobListEmptyProps {
  /** Omit when there is nothing to clear. */
  onClearFilters?: () => void;
}

export function JobListEmpty({ onClearFilters }: Readonly<JobListEmptyProps>) {
  const t = useTranslations('publicJobs.list');

  return (
    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
        <Building2 className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{t('empty.title')}</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">{t('empty.description')}</p>
      </div>
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} className="mt-2">
          {t('empty.clearButton')}
        </Button>
      )}
    </div>
  );
}
