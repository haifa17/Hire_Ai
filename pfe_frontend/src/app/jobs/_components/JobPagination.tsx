import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getPageItems } from '../_utils/job-list-helpers';

const NAV_BUTTON_CLASS =
  'h-9 px-3 rounded-xl border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40';

interface JobPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  hasPrevious: boolean;
  hasNext: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function JobPagination({
  page,
  totalPages,
  totalItems,
  hasPrevious,
  hasNext,
  disabled = false,
  onPageChange,
}: Readonly<JobPaginationProps>) {
  const t = useTranslations('publicJobs.list');

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs mt-6">
      <p className="text-xs font-semibold text-slate-500">
        {t('pagination.pageOf', { page, total: totalPages, count: totalItems })}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious || disabled}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={NAV_BUTTON_CLASS}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('pagination.previous')}
        </Button>

        <div className="flex items-center gap-1">
          {getPageItems(page, totalPages).map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-xs font-bold text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={`page-${item}`}
                type="button"
                aria-current={page === item ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  'h-9 w-9 rounded-xl text-xs font-bold transition-all',
                  page === item
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext || disabled}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className={NAV_BUTTON_CLASS}
        >
          {t('pagination.next')} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
