/**
 * Project utilities - Pure functions for data transformation and validation
 */

import { ProjectItem, ProjectValidationError, EMPTY_PROJECT_ITEM } from "./types";

export function validateProjectItem(item: ProjectItem): ProjectValidationError[] {
  const errors: ProjectValidationError[] = [];
  if (!item.title.trim()) {
    errors.push({ field: "title", message: "Project Title is required" });
  }
  return errors;
}

/**
 * Stringifies to JSON for robust storage
 */
export function projectItemToString(item: ProjectItem): string {
  return JSON.stringify(item);
}

function stringifyProjectTech(techRaw: unknown): string {
  if (Array.isArray(techRaw)) return techRaw.join(", ");
  if (typeof techRaw === "string") return techRaw;
  return "";
}

function parseProjectJsonObject(parsed: Record<string, unknown>): ProjectItem {
  const techRaw = parsed.technologies || parsed.tech;
  const techStr = stringifyProjectTech(techRaw);
  const keywords = parsed.keywords || parsed.tags || techStr || "";

  return {
    title: (parsed.title || parsed.name || "") as string,
    url: (parsed.url || parsed.link || parsed.projectUrl || "") as string,
    keywords: keywords as string,
    description: (parsed.description || parsed.summary || "") as string,
  };
}

const isProjectUrl = (str: string) =>
  /^(?:https?:\/\/|www\.)[^\s]+$/i.test(str) ||
  (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s]*$/i.test(str) && !str.includes(" "));

const isKeywordsLike = (str: string) => str.includes(",") || str.split(" ").length <= 4;

/** Step 1: pulls the URL part (if any) out of remainingParts. */
function extractProjectUrlPart(remainingParts: string[], item: ProjectItem): void {
  const urlIndex = remainingParts.findIndex(isProjectUrl);
  if (urlIndex !== -1) {
    item.url = remainingParts[urlIndex];
    remainingParts.splice(urlIndex, 1);
  }
}

/** Step 2: pulls the keywords / tech-stack part (if any) out of remainingParts. */
function extractProjectKeywordsPart(remainingParts: string[], item: ProjectItem): void {
  const techPrefixRegex = /^(?:tech|technologies|keywords|stack|tools):\s*/i;
  const techIndex = remainingParts.findIndex((p) => techPrefixRegex.test(p));
  if (techIndex !== -1) {
    item.keywords = remainingParts[techIndex];
    remainingParts.splice(techIndex, 1);
  }
}

function assignProjectSingleRemainingPart(remainingParts: string[], item: ProjectItem): void {
  const single = remainingParts[0];
  if (!item.keywords && isKeywordsLike(single)) {
    item.keywords = single;
  } else {
    item.description = single;
  }
}

function assignProjectTwoOrMoreRemainingParts(remainingParts: string[], item: ProjectItem): void {
  const [p0, p1] = remainingParts;
  if (!item.keywords && isKeywordsLike(p0)) {
    item.keywords = p0;
    item.description = p1;
  } else if (!item.keywords && isKeywordsLike(p1)) {
    item.description = p0;
    item.keywords = p1;
  } else {
    item.description = p0;
    if (!item.keywords) item.keywords = p1;
  }
  if (remainingParts.length > 2) {
    item.description += " | " + remainingParts.slice(2).join(" | ");
  }
}

/** Step 3: assigns whatever's left to description and keywords. */
function assignProjectRemainingParts(remainingParts: string[], item: ProjectItem): void {
  if (remainingParts.length === 1) {
    assignProjectSingleRemainingPart(remainingParts, item);
  } else if (remainingParts.length >= 2) {
    assignProjectTwoOrMoreRemainingParts(remainingParts, item);
  }
}

/** Fallback for raw text formats e.g. "Title | URL | Keywords | Description" */
function parseProjectFromText(trimmed: string): ProjectItem {
  const item: ProjectItem = { ...EMPTY_PROJECT_ITEM };
  const rawParts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);

  if (rawParts.length === 0) return item;

  // First part is always title
  item.title = rawParts[0];

  const remainingParts = rawParts.slice(1);
  extractProjectUrlPart(remainingParts, item);
  extractProjectKeywordsPart(remainingParts, item);
  assignProjectRemainingParts(remainingParts, item);

  return item;
}

/**
 * Parses ProjectItem from JSON string or falls back to text parsing
 */
export function stringToProjectItem(formatted: string): ProjectItem | null {
  if (!formatted.trim()) return null;
  const trimmed = formatted.trim();

  // If it's a JSON string, parse it directly
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return parseProjectJsonObject(JSON.parse(trimmed));
    } catch {
      // Fallback below
    }
  }

  return parseProjectFromText(trimmed);
}

export function stringsToProjectItems(formatted: string[]): ProjectItem[] {
  return formatted
    .map(stringToProjectItem)
    .filter((item): item is ProjectItem => item !== null);
}
