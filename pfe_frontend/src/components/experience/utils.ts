/**
 * Experience utilities - Pure functions for data transformation and validation
 */

import {
  ExperienceItem,
  ExperienceValidationError,
  EMPTY_EXPERIENCE_ITEM,
} from "./types";

export function validateExperienceItem(
  item: ExperienceItem,
): ExperienceValidationError[] {
  const errors: ExperienceValidationError[] = [];

  if (!item.jobTitle.trim()) {
    errors.push({ field: "jobTitle", message: "Job title is required" });
  }

  if (!item.companyName.trim()) {
    errors.push({ field: "companyName", message: "Company name is required" });
  }

  if (!item.startDate.trim() && !item.endDate.trim()) {
    errors.push({
      field: "startDate",
      message: "At least start or end date is required",
    });
  }

  return errors;
}

function buildLocation(item: ExperienceItem): string {
  if (item.city && item.country) {
    return `${item.city.trim()}, ${item.country.trim()}`;
  }

  if (item.city) {
    return item.city.trim();
  }

  if (item.country) {
    return item.country.trim();
  }

  return item.location.trim();
}

function buildHeaderLine(item: ExperienceItem): string {
  const jobAndCompany = [item.jobTitle.trim(), item.companyName.trim()]
    .filter(Boolean)
    .join(" - ");

  const dates =
    item.startDate.trim() && item.endDate.trim()
      ? `${item.startDate.trim()} to ${item.endDate.trim()}`
      : item.startDate.trim() || item.endDate.trim() || "";

  return [jobAndCompany, buildLocation(item), dates].filter(Boolean).join(" | ");
}

export function experienceItemToString(item: ExperienceItem): string {
  const lines: string[] = [];
  const headerLine = buildHeaderLine(item);

  if (headerLine) {
    lines.push(headerLine);
  }

  if (item.description.trim()) {
    lines.push(item.description.trim());
  }

  const achievementLines = item.achievements
    .filter((achievement) => achievement.trim())
    .map((achievement) => `  - ${achievement.trim()}`);

  if (achievementLines.length > 0) {
    lines.push(achievementLines.join("\n"));
  }

  return lines.join("\n");
}

function parseHeaderParts(parts: string[], item: ExperienceItem): void {
  if (parts[0]) {
    const dashIdx = parts[0].lastIndexOf(" - ");
    if (dashIdx > 0) {
      item.jobTitle = parts[0].slice(0, dashIdx).trim();
      item.companyName = parts[0].slice(dashIdx + 3).trim();
    } else {
      item.jobTitle = parts[0];
    }
  }

  if (parts[1]) {
    const locationParts = parts[1].split(",").map((part) => part.trim());
    if (locationParts.length >= 2) {
      item.city = locationParts[0] || "";
      item.country = locationParts[1] || "";
    } else {
      item.location = parts[1];
    }
  }

  if (parts[2]) {
    const dateParts = parts[2].toLowerCase().split(" to ");
    if (dateParts.length === 2) {
      item.startDate = parts[2].slice(0, parts[2].toLowerCase().indexOf(" to ")).trim();
      item.endDate = parts[2].slice(parts[2].toLowerCase().indexOf(" to ") + 4).trim();
    } else {
      item.startDate = parts[2];
    }
  }

  if (parts[3]) {
    item.endDate = parts[3];
  }
}

function parseLegacyMetadata(lines: string[], item: ExperienceItem): void {
  if (lines[1]) {
    const metaParts = lines[1].split("|").map((part) => part.trim());
    if (metaParts[0]) {
      item.location = metaParts[0];
    }
    if (metaParts[1]) {
      item.startDate = metaParts[1];
    }
    if (metaParts[2]) {
      item.endDate = metaParts[2];
    }
  }
}

function parseContentLines(lines: string[], item: ExperienceItem): void {
  const achievementLines: string[] = [];
  const descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.includes("|")) {
      continue;
    }

    if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
      const text = trimmed.replace(/^[•-]\s*/, "").trim();
      if (text) {
        achievementLines.push(text);
      }
      continue;
    }

    descriptionLines.push(trimmed);
  }

  item.description = descriptionLines.join(" ");
  item.achievements = achievementLines;
}

export function stringToExperienceItem(
  formatted: string,
): ExperienceItem | null {
  if (!formatted.trim()) {
    return null;
  }

  const item = { ...EMPTY_EXPERIENCE_ITEM };
  const lines = formatted.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return null;
  }

  const firstLine = lines[0].trim();

  if (firstLine.includes("|")) {
    parseHeaderParts(firstLine.split("|").map((part) => part.trim()), item);
  } else {
    const dashIndex = firstLine.lastIndexOf(" - ");
    if (dashIndex > 0) {
      item.jobTitle = firstLine.slice(0, dashIndex).trim();
      item.companyName = firstLine.slice(dashIndex + 3).trim();
    } else {
      item.jobTitle = firstLine;
    }

    parseLegacyMetadata(lines, item);
  }

  parseContentLines(lines.slice(1), item);

  return validateExperienceItem(item).length === 0 ? item : null;
}

export function experienceItemsToStrings(items: ExperienceItem[]): string[] {
  return items.map(experienceItemToString);
}

export function stringsToExperienceItems(
  formatted: string[],
): ExperienceItem[] {
  return formatted
    .map(stringToExperienceItem)
    .filter((item): item is ExperienceItem => item !== null);
}
