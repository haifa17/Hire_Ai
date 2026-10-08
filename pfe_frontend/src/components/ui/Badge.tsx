import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-gray-100 text-gray-700 border-transparent',
      success: 'bg-green-50 text-green-700 border-green-200',
      info: 'bg-[var(--editor-primary-soft)] text-[var(--editor-primary)] border-blue-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      danger: 'bg-red-50 text-red-700 border-red-200',
      outline: 'bg-transparent text-gray-600 border-gray-300',
    };

    const sizes = {
      sm: 'text-[9px] px-1.5 py-0.5',
      md: 'text-[10px] px-2 py-0.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';

export { Badge };
