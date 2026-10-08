import { ResumeTemplateId } from "./ResumeTemplate";

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "socialLinks"
  | "custom";

export type PhotoShape = "square" | "rounded" | "circle";
export type PhotoPosition = "left" | "right";

export interface ResumeSection {
  id: string;
  title: string;
  type: SectionType;
  content: string;
  items: string[];
}

export interface ResumeTheme {
  template: ResumeTemplateId;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  pageBackground: string;
  fontFamily: string;
  baseFontSize: number;
  lineHeight: number;
}

export interface ResumeVisualContent {
  editorVersion: 1;
  photoUrl: string;
  photoSettings: {
    size: number;
    shape: PhotoShape;
    position: PhotoPosition;
  };
  header: {
    fullName: string;
    professionalTitle: string;
    email: string;
    phone: string;
    address: string;
    socialLinks?: { id: string; network: string; url: string; label?: string; showIcon?: boolean }[];
    alignment?: "auto" | "left" | "center" | "right";
    contactOrder?: string[];
  };
  theme: ResumeTheme;
  sections: ResumeSection[];
  rawSource?: unknown;
}

export const DEFAULT_THEME: ResumeTheme = {
  template: "executive",
  primaryColor: "#1E3A8A",
  accentColor: "#111827",
  textColor: "#111827",
  pageBackground: "#FFFFFF",
  fontFamily: "Georgia, Cambria, Times New Roman, serif",
  baseFontSize: 15,
  lineHeight: 1.55,
};

export const DEFAULT_PHOTO_SETTINGS: ResumeVisualContent["photoSettings"] = {
  size: 112,
  shape: "rounded",
  position: "right",
};

export const FONT_OPTIONS = [
  {
    label: "Editorial (Serif)",
    value: "Georgia, Cambria, Times New Roman, serif",
  },
  { label: "Modern (Sans)", value: "Poppins, Segoe UI, Helvetica, sans-serif" },
  { label: "Technical (Mono)", value: "IBM Plex Mono, Consolas, monospace" },
  { label: "Classic (Book)", value: "Garamond, Baskerville, serif" },
];
