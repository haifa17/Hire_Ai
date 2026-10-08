'use client';

import { useTranslations } from 'next-intl';

export function NewsletterForm() {
  const t = useTranslations('footer');

  return (
    <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder={t('newsletter.emailPlaceholder')}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="shrink-0 w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
        aria-label={t('newsletter.subscribe')}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
}
