/**
 * Education data model for structured editing
 */

export interface EducationItem {
  school: string;
  degree: string;
  field: string;
  startDate: string; // ISO date or Year
  endDate: string; // ISO date or Year or "Present"
  address: string;
  city?: string;
  country?: string;
  description: string;
}

export interface EducationValidationError {
  field: keyof EducationItem;
  message: string;
}

export const EMPTY_EDUCATION_ITEM: EducationItem = {
  school: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  address: "",
  city: "",
  country: "",
  description: "",
};
