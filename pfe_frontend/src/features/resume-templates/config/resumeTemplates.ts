import {
  ResumeTemplateDefinition,
  ResumeTemplateId,
  ResumeTemplateTheme,
} from "@/domain/models/ResumeTemplate";

export const RESUME_TEMPLATES: Record<
  ResumeTemplateId,
  ResumeTemplateDefinition
> = {
  classic: {
    id: "classic",
    label: "Harvard ATS (Classic)",
    description: "Standard universally recognized Harvard-style ATS template.",
    panelBorderClass: "border-slate-300",
    preview: {
      layout: "classic",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#111827",
      accentColor: "#374151",
      textColor: "#111827",
      pageBackground: "#FFFFFF",
      fontFamily: "Times New Roman, Georgia, serif",
      baseFontSize: 14,
      lineHeight: 1.5,
    },
  },
  executive: {
    id: "executive",
    label: "Corporate Executive",
    description: "Authoritative serif design tailored for leadership and management.",
    panelBorderClass: "border-zinc-300",
    preview: {
      layout: "executive",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#0F172A",
      accentColor: "#334155",
      textColor: "#111827",
      pageBackground: "#FFFFFF",
      fontFamily: "Georgia, Times New Roman, serif",
      baseFontSize: 14.5,
      lineHeight: 1.52,
    },
  },
  analyst: {
    id: "analyst",
    label: "Tech & Data Analyst",
    description: "Crisp modern layout with dedicated contact column and 2-col skills.",
    panelBorderClass: "border-slate-200",
    preview: {
      layout: "analyst",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#1F2937",
      accentColor: "#2563EB",
      textColor: "#111827",
      pageBackground: "#FFFFFF",
      fontFamily: "Arial, Helvetica, sans-serif",
      baseFontSize: 14,
      lineHeight: 1.5,
    },
  },
  modern: {
    id: "modern",
    label: "Modern Clean Sans",
    description: "Contemporary layout with bold section headings and blue accents.",
    panelBorderClass: "border-blue-200",
    preview: {
      layout: "modern",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#0F2942",
      accentColor: "#2563EB",
      textColor: "#1F2937",
      pageBackground: "#FFFFFF",
      fontFamily: "Inter, Segoe UI, sans-serif",
      baseFontSize: 14,
      lineHeight: 1.55,
    },
  },
  worded: {
    id: "worded",
    label: "Editorial Serif (Ivy)",
    description: "Elegant centered header layout inspired by high-end publishing.",
    panelBorderClass: "border-stone-200",
    preview: {
      layout: "worded",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#18181B",
      accentColor: "#52525B",
      textColor: "#18181B",
      pageBackground: "#FFFFFF",
      fontFamily: "Garamond, Times New Roman, Georgia, serif",
      baseFontSize: 14,
      lineHeight: 1.48,
    },
  },
  balanced: {
    id: "balanced",
    label: "Traditional Timeline",
    description: "Clean two-column section grid with section headers on left.",
    panelBorderClass: "border-gray-300",
    preview: {
      layout: "balanced",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#111827",
      accentColor: "#4B5563",
      textColor: "#111827",
      pageBackground: "#FFFFFF",
      fontFamily: "Georgia, Times New Roman, serif",
      baseFontSize: 13.5,
      lineHeight: 1.45,
    },
  },
  creative: {
    id: "creative",
    label: "Vibrant ATS",
    description: "Eye-catching accent bars and skill badges with 100% ATS readability.",
    panelBorderClass: "border-indigo-200",
    preview: {
      layout: "creative",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#1E1B4B",
      accentColor: "#4F46E5",
      textColor: "#1F2937",
      pageBackground: "#FFFFFF",
      fontFamily: "Poppins, Segoe UI, sans-serif",
      baseFontSize: 14,
      lineHeight: 1.55,
    },
  },
  minimal: {
    id: "minimal",
    label: "Compact Minimalist",
    description: "Clean high-density template maximizing readability and content.",
    panelBorderClass: "border-gray-200",
    preview: {
      layout: "minimal",
      headingCase: "uppercase",
    },
    theme: {
      primaryColor: "#18181B",
      accentColor: "#71717A",
      textColor: "#27272A",
      pageBackground: "#FFFFFF",
      fontFamily: "Inter, Roboto, sans-serif",
      baseFontSize: 13.5,
      lineHeight: 1.48,
    },
  },
};

export const resumeTemplateIds: ResumeTemplateId[] = [
  "classic",
  "executive",
  "analyst",
  "modern",
  "worded",
  "balanced",
  "creative",
  "minimal",
];

const LEGACY_TEMPLATE_ALIASES: Record<string, ResumeTemplateId> = {};

export function isResumeTemplateId(value: unknown): value is ResumeTemplateId {
  return typeof value === "string" && value in RESUME_TEMPLATES;
}

export function normalizeResumeTemplateId(
  value: unknown,
  fallback: ResumeTemplateId = "executive",
): ResumeTemplateId {
  if (isResumeTemplateId(value)) {
    return value;
  }
  if (typeof value === "string" && LEGACY_TEMPLATE_ALIASES[value]) {
    return LEGACY_TEMPLATE_ALIASES[value];
  }
  return fallback;
}

export function getResumeTemplateDefinition(
  template: ResumeTemplateId,
): ResumeTemplateDefinition {
  return RESUME_TEMPLATES[template];
}

export function getResumeTemplateTheme(
  template: ResumeTemplateId,
): ResumeTemplateTheme {
  return RESUME_TEMPLATES[template].theme;
}

export function getResumeTemplatePanelBorderClass(
  template: ResumeTemplateId,
): string {
  return RESUME_TEMPLATES[template].panelBorderClass;
}
