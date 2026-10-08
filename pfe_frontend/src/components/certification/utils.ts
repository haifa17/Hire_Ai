/**
 * Certification utilities - Pure functions for data transformation and validation
 */

import {
  CertificationItem,
  CertificationValidationError,
  EMPTY_CERTIFICATION_ITEM,
} from "./types";

export function validateCertificationItem(
  item: CertificationItem,
): CertificationValidationError[] {
  const errors: CertificationValidationError[] = [];
  if (!item.name.trim()) {
    errors.push({ field: "name", message: "Certification Name is required" });
  }
  if (!item.issuer.trim()) {
    errors.push({
      field: "issuer",
      message: "Issuing Organization is required",
    });
  }
  return errors;
}

/**
 * Stringifies to JSON for robust storage
 */
export function certificationItemToString(item: CertificationItem): string {
  return JSON.stringify(item);
}

/**
 * Parses CertificationItem from JSON string or falls back to text parsing
 */
export function stringToCertificationItem(
  formatted: string,
): CertificationItem | null {
  if (!formatted.trim()) return null;
  const trimmed = formatted.trim();

  // If it's a JSON string, parse it directly
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        name: parsed.name || parsed.title || "",
        issuer: parsed.issuer || parsed.organization || "",
        issueDate: parsed.issueDate || parsed.date || "",
        expiryDate: parsed.expiryDate || "",
        url: parsed.url || parsed.link || "",
        fileUrl: parsed.fileUrl || parsed.file || "",
      };
    } catch {
      // Fallback below
    }
  }

  // Fallback for raw text formats e.g. "Name - Issuer - Date - URL"
  const item: CertificationItem = { ...EMPTY_CERTIFICATION_ITEM };
  // The legacy separator used in formatCertificationsItem was " - "
  const parts = trimmed.split(" - ").map((p) => p.trim());

  if (parts.length > 0) item.name = parts[0];
  if (parts.length > 1) item.issuer = parts[1];

  const remainingParts = parts.slice(2);
  const urlIndex = remainingParts.findIndex(
    (p) => /^https?:\/\//i.test(p) || /^www\./i.test(p),
  );
  if (urlIndex !== -1) {
    item.url = remainingParts[urlIndex];
    remainingParts.splice(urlIndex, 1);
  }

  if (remainingParts.length > 0) {
    // If the part contains "to", we might have "issueDate to expiryDate"
    // Wait, old format didn't have expiryDate
    const dateStr = remainingParts[0];
    if (dateStr.toLowerCase().includes(" to ")) {
      const dates = dateStr.split(/to/i);
      item.issueDate = dates[0].trim();
      item.expiryDate = dates[1].trim();
    } else {
      item.issueDate = dateStr;
    }
  }

  return item;
}

export function stringsToCertificationItems(
  formatted: string[],
): CertificationItem[] {
  return formatted
    .map(stringToCertificationItem)
    .filter((item): item is CertificationItem => item !== null);
}
