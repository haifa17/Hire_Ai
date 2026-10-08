import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Utility function to merge tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveUploadUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  try {
    return new URL(url, API_ORIGIN).toString();
  } catch {
    return url;
  }
}
