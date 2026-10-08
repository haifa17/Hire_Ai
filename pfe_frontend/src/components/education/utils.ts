/**
 * Education utilities - Pure functions for data transformation and validation
 */

import { EducationItem, EducationValidationError, EMPTY_EDUCATION_ITEM } from "./types";

export function validateEducationItem(item: EducationItem): EducationValidationError[] {
  const errors: EducationValidationError[] = [];
  if (!item.school.trim()) {
    errors.push({ field: "school", message: "School / University is required" });
  }
  return errors;
}

/**
 * Stringifies to JSON for robust storage
 */
export function educationItemToString(item: EducationItem): string {
  return JSON.stringify(item);
}

function parseEducationJsonObject(parsed: Record<string, unknown>): EducationItem {
  return {
    school: (parsed.school || parsed.institution || parsed.university || "") as string,
    degree: (parsed.degree || parsed.level || "") as string,
    field: (parsed.field || parsed.major || parsed.fieldOfStudy || "") as string,
    startDate: (parsed.startDate || parsed.startYear || parsed.start || "") as string,
    endDate: (parsed.endDate || parsed.endYear || parsed.end || parsed.year || "") as string,
    address: (parsed.address || parsed.location || "") as string,
    city: (parsed.city || "") as string,
    country: (parsed.country || "") as string,
    description: (parsed.description || "") as string,
  };
}

const isEducationSchool = (str: string) =>
  /\b(university|univ|université|college|school|institute|ecole|école|academy|polytechnic|lycée|faculté|faculty)\b/i.test(str);

const isEducationDegree = (str: string) =>
  /\b(bachelor|master|b\.s|m\.s|ph\.d|doctor|diploma|b\.a|m\.a|associate|degree|licence|magister)\b/i.test(str);

const isEducationDate = (str: string) => {
  if (/^present$/i.test(str)) return true;
  const hasYear = /(?:19|20)\d{2}/.test(str);
  const hasRangeSep = /(?:to|-|–|—|\/)/i.test(str) || /present/i.test(str);
  return hasYear && (hasRangeSep || str.length <= 15);
};

/** Step 1: pulls the date part (if any) out of rawParts, filling item.startDate/endDate. */
function extractEducationDateParts(rawParts: string[], item: EducationItem): string[] {
  const remainingParts: string[] = [];
  for (const part of rawParts) {
    if (isEducationDate(part) && !item.startDate && !item.endDate) {
      const dateSplit = part.split(/(?:to|-|–|—)/i);
      if (dateSplit.length >= 2) {
        item.startDate = dateSplit[0].trim();
        item.endDate = dateSplit[1].trim();
      } else if (dateSplit.length === 1) {
        item.startDate = dateSplit[0].trim();
      }
    } else {
      remainingParts.push(part);
    }
  }
  return remainingParts;
}

/** Step 2: pulls the address/location part (if any) out of remainingParts. */
function extractEducationLocationPart(remainingParts: string[], item: EducationItem): void {
  const locationIndex = remainingParts.findIndex(
    (p) =>
      p.includes(",") &&
      !isEducationSchool(p) &&
      !isEducationDegree(p) &&
      !p.toLowerCase().includes("description") &&
      !p.toLowerCase().includes("coursework"),
  );

  if (locationIndex !== -1) {
    const addr = remainingParts[locationIndex];
    const [c, country] = addr.split(",").map((s) => s.trim());
    item.city = c || "";
    item.country = country || "";
    if (!item.city && !item.country) {
      item.address = addr;
    }
    remainingParts.splice(locationIndex, 1);
  }
}

/** Step 3: pulls the description part (if any) out of remainingParts. */
function extractEducationDescriptionPart(remainingParts: string[], item: EducationItem): void {
  const descIndex = remainingParts.findIndex(
    (p) =>
      p.length > 60 ||
      /^(?:description|coursework|gpa|honors|relevant)/i.test(p),
  );

  if (descIndex !== -1) {
    item.description = remainingParts[descIndex];
    remainingParts.splice(descIndex, 1);
  }
}

function assignEducationSinglePart(remainingParts: string[], item: EducationItem): void {
  const single = remainingParts[0];
  if (isEducationDegree(single)) {
    item.degree = single;
  } else {
    item.school = single;
  }
}

function assignEducationTwoParts(remainingParts: string[], item: EducationItem): void {
  const [p0, p1] = remainingParts;
  // "Normal order" (degree, school) wins whenever there's positive evidence for it,
  // or when there's no evidence either way — swap only on positive evidence for (school, degree).
  if ((isEducationSchool(p1) || isEducationDegree(p0)) || !(isEducationSchool(p0) || isEducationDegree(p1))) {
    item.degree = p0;
    item.school = p1;
  } else {
    item.school = p0;
    item.degree = p1;
  }
}

function assignEducationThreeOrMoreParts(remainingParts: string[], item: EducationItem): void {
  const [p0, p1, p2] = remainingParts;
  // "Normal order" (degree, field, school) wins on positive evidence, or when there's
  // no positive evidence for either alternative ordering below.
  if (isEducationSchool(p2) || (!isEducationSchool(p1) && !isEducationSchool(p0))) {
    item.degree = p0;
    item.field = p1;
    item.school = p2;
  } else if (isEducationSchool(p1)) {
    item.degree = p0;
    item.school = p1;
    item.field = p2;
  } else {
    item.school = p0;
    item.degree = p1;
    item.field = p2;
  }

  if (remainingParts.length > 3 && !item.description) {
    item.description = remainingParts.slice(3).join(" | ");
  }
}

/** Step 4: maps whatever text parts are left to degree/field/school. */
function assignEducationRemainingParts(remainingParts: string[], item: EducationItem): void {
  if (remainingParts.length === 1) {
    assignEducationSinglePart(remainingParts, item);
  } else if (remainingParts.length === 2) {
    assignEducationTwoParts(remainingParts, item);
  } else if (remainingParts.length >= 3) {
    assignEducationThreeOrMoreParts(remainingParts, item);
  }
}

/** Fallback for raw text formats e.g. "Degree | Field | School | Address | Dates | Description"
 * or "Degree | School | Dates" */
function parseEducationFromText(trimmed: string): EducationItem {
  const item: EducationItem = { ...EMPTY_EDUCATION_ITEM };
  const rawParts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);

  if (rawParts.length === 0) return item;

  const remainingParts = extractEducationDateParts(rawParts, item);
  extractEducationLocationPart(remainingParts, item);
  extractEducationDescriptionPart(remainingParts, item);
  assignEducationRemainingParts(remainingParts, item);

  return item;
}

/**
 * Parses EducationItem from JSON string or falls back to text parsing
 */
export function stringToEducationItem(formatted: string): EducationItem | null {
  if (!formatted.trim()) return null;
  const trimmed = formatted.trim();

  // If it's a JSON string, parse it directly
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return parseEducationJsonObject(JSON.parse(trimmed));
    } catch {
      // Fallback below
    }
  }

  return parseEducationFromText(trimmed);
}

export function stringsToEducationItems(formatted: string[]): EducationItem[] {
  return formatted
    .map(stringToEducationItem)
    .filter((item): item is EducationItem => item !== null);
}
