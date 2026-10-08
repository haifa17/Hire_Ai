import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import { defaultLocale, locales, type Locale } from "./config";

// Messages are split into one file per domain under messages/<locale>/*.json
// (auth, navbar, dashboardCandidate, ...) and merged here so multiple people
// can edit different domains without touching a single giant JSON file.
function loadMessages(locale: Locale) {
  const dir = path.join(process.cwd(), "messages", locale);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  const messages: Record<string, unknown> = {};
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    Object.assign(messages, content);
  }
  return messages;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale: Locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  return {
    locale,
    messages: loadMessages(locale),
  };
});
