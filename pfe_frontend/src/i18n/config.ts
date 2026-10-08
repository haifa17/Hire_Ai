export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

// English is the default language of the application.
export const defaultLocale: Locale = "en";

export const localeCookieName = "locale";
