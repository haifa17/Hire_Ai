/**
 * Project data model for structured editing
 */

export interface ProjectItem {
  title: string;
  url: string;
  keywords: string;
  description: string;
}

export interface ProjectValidationError {
  field: keyof ProjectItem;
  message: string;
}

export const EMPTY_PROJECT_ITEM: ProjectItem = {
  title: "",
  url: "",
  keywords: "",
  description: "",
};
