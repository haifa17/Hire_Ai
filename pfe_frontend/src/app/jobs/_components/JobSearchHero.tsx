import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, MapPin, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const SEARCH_INPUT_CLASS =
  'w-full pl-12 h-12 text-sm md:text-base rounded-2xl bg-slate-800/60 border-slate-700/60 text-white placeholder:text-slate-400 focus:border-blue-500 focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all';

interface JobSearchHeroProps {
  backUrl: string;
  search: string;
  location: string;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function JobSearchHero({
  backUrl,
  search,
  location,
  onSearchChange,
  onLocationChange,
  onSubmit,
  hasActiveFilters,
  onClearFilters,
}: Readonly<JobSearchHeroProps>) {
  const t = useTranslations('publicJobs.list');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <header className="relative overflow-hidden bg-slate-950 pt-8 pb-10 text-white shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href={backUrl}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md mb-1">
              <Sparkles className="w-3.5 h-3.5" /> {t('hero.badge')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              {t('hero.title')}
            </h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-2.5 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('search.titlePlaceholder')}
              className={SEARCH_INPUT_CLASS}
            />
          </div>
          <div className="flex-1 w-full relative hidden sm:block">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder={t('search.locationPlaceholder')}
              className={SEARCH_INPUT_CLASS}
            />
          </div>
          <Button
            type="submit"
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all shrink-0"
          >
            {t('search.button')}
          </Button>
        </form>

        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-4 mt-4 pt-2">
            <span className="text-xs font-medium text-slate-400">{t('filtersBar.active')}</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {t('filtersBar.clear')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
