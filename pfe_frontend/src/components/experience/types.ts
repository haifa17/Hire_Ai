/**
 * Experience data model for structured editing
 */

export interface ExperienceItem {
  jobTitle: string;
  companyName: string;
  location: string;
  city?: string;
  country?: string;
  startDate: string; // ISO date or "Present"
  endDate: string; // ISO date or "Present"
  description: string;
  achievements: string[];
}

export interface ExperienceValidationError {
  field: keyof ExperienceItem;
  message: string;
}

export interface ExperienceFormState {
  isEditing: boolean;
  editingIndex: number | null;
  currentItem: ExperienceItem;
  errors: ExperienceValidationError[];
}

export const EMPTY_EXPERIENCE_ITEM: ExperienceItem = {
  jobTitle: "",
  companyName: "",
  location: "",
  city: "",
  country: "",
  startDate: "",
  endDate: "Present",
  description: "",
  achievements: [],
};
