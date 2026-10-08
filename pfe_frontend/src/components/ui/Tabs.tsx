import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  readonly tabs: TabItem<T>[];
  readonly active: T;
  readonly onChange: (id: T) => void;
  readonly className?: string;
  /** 'grid' spreads tabs evenly (good for a fixed-width sidebar); 'row' left-aligns them. */
  readonly layout?: 'grid' | 'row';
}

/**
 * Segmented tab bar shared across the app (resume editor sidebar, settings
 * panels, ...). Keeps tab styling consistent instead of each screen
 * hand-rolling its own button row.
 */
export function Tabs<T extends string>({ tabs, active, onChange, className, layout = 'grid' }: TabsProps<T>) {
  return (
    <div
      className={cn(
        'border-b border-gray-100 bg-[var(--editor-surface-muted)]',
        layout === 'grid' ? `grid` : 'flex flex-wrap',
        className,
      )}
      style={layout === 'grid' ? { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` } : undefined}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all',
              isActive
                ? 'bg-white text-[var(--editor-primary)]'
                : 'text-gray-400 hover:bg-white/60 hover:text-gray-600',
            )}
          >
            {tab.icon && <span className={cn('h-5 w-5', isActive && 'scale-110')}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--editor-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
