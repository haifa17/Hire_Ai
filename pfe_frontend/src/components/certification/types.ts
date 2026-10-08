/**
 * Certification data model for structured editing
 */

export interface CertificationItem {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  url: string;
  fileUrl?: string;
}

export interface CertificationValidationError {
  field: keyof CertificationItem;
  message: string;
}

export const EMPTY_CERTIFICATION_ITEM: CertificationItem = {
  name: "",
  issuer: "",
  issueDate: "",
  expiryDate: "",
  url: "",
  fileUrl: "",
};
