import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales, localeCookieName } from "@/i18n/config";

// Determines the initial language once per visitor: respects an existing
// `locale` cookie (set by the in-app language switcher), otherwise falls
// back to the browser's Accept-Language header, and defaults to English.
function detectLocale(request: NextRequest): string {
  const existing = request.cookies.get(localeCookieName)?.value;
  if (existing && (locales as readonly string[]).includes(existing)) {
    return existing;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.trim();
    if (preferred && (locales as readonly string[]).includes(preferred)) {
      return preferred;
    }
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(localeCookieName)) {
    response.cookies.set(localeCookieName, detectLocale(request), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
