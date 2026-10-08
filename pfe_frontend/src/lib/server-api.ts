/**
 * Base URL for backend calls made from the SERVER (React Server Components,
 * route handlers) — never from the browser.
 *
 * The two are not interchangeable under Docker:
 *   - the browser reaches the backend through a published host port, which is
 *     what NEXT_PUBLIC_API_URL holds (http://localhost:3000);
 *   - this container reaches it through Docker's internal DNS, by service
 *     name (http://backend:3000). `localhost` here would mean the frontend
 *     container itself, and the fetch would be refused.
 *
 * INTERNAL_API_URL is set by docker-compose.yml. Outside Docker it is unset
 * and this falls back to NEXT_PUBLIC_API_URL, so local `npm run dev` keeps
 * working unchanged.
 *
 * Server-side only: INTERNAL_API_URL is not a NEXT_PUBLIC_* variable, so it
 * is `undefined` in the browser bundle. Do not call this from a client
 * component — use the axios instance in `lib/api.ts` there.
 */
export function getServerApiBaseUrl(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000"
  );
}

/**
 * Base URL to embed in HTML that the BROWSER will resolve (image `src`,
 * links). Always the public, host-reachable origin.
 */
export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}
