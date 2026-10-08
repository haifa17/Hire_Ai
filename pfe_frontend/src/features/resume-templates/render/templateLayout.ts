import { ResumeTemplateId } from "@/domain/models/ResumeTemplate";

/**
 * Declarative layout rules per template.
 *
 * This is the single source of truth for how a template looks — it drives both
 * the full-size A4 render (`ResumeDocument`) and the miniature preview card
 * (`ResumeTemplatePicker`), so the two can never visually drift apart the way
 * the old per-file `if/else` branches used to.
 */
export type BulletStyle = "dot" | "dash";
export type SkillsStyle = "grid" | "inline" | "badge" | "pill" | "bullets";
export type HeadingBorder =
  | "underline-primary"
  | "underline-accent-thin"
  | "underline-accent-thick"
  | "underline-accent-dotted"
  | "line-right"
  | "bar-left"
  | "none";
export type HeaderAlign = "left" | "center" | "right";

export interface TemplateLayout {
  /** Bullet glyph used for list items (experience/education/default). */
  bulletStyle: BulletStyle;
  /** Default text alignment for the header block when the user hasn't overridden it. */
  headerAlign: HeaderAlign;
  /** Whether contact info renders as a single line under the name, or a side column. */
  contactLayout: "line" | "sideColumn";
  /** Section title typography. */
  heading: {
    sizePx: number;
    weight: 700 | 800 | 900;
    trackingEm: number;
  };
  headingBorder: HeadingBorder;
  /** How skills/languages lists render. */
  skillsStyle: SkillsStyle;
  /** Relative name/title sizing (px, before the theme's baseFontSize scaling). */
  nameSizePx: number;
  titleSizePx: number;
  /** Page padding — compact templates use less. */
  density: "comfortable" | "compact";
  /** Extra vertical rhythm between sections. */
  sectionGapClass: string;
}

export const TEMPLATE_LAYOUTS: Record<ResumeTemplateId, TemplateLayout> = {
  classic: {
    bulletStyle: "dot",
    headerAlign: "center",
    contactLayout: "line",
    heading: { sizePx: 13, weight: 700, trackingEm: 0.12 },
    headingBorder: "underline-primary",
    skillsStyle: "inline",
    nameSizePx: 32,
    titleSizePx: 14,
    density: "comfortable",
    sectionGapClass: "space-y-6",
  },
  executive: {
    bulletStyle: "dot",
    headerAlign: "left",
    contactLayout: "line",
    heading: { sizePx: 12.5, weight: 800, trackingEm: 0.15 },
    headingBorder: "line-right",
    skillsStyle: "inline",
    nameSizePx: 36,
    titleSizePx: 14.5,
    density: "comfortable",
    sectionGapClass: "space-y-6",
  },
  analyst: {
    bulletStyle: "dash",
    headerAlign: "left",
    contactLayout: "sideColumn",
    heading: { sizePx: 11.5, weight: 800, trackingEm: 0.24 },
    headingBorder: "underline-accent-dotted",
    skillsStyle: "grid",
    nameSizePx: 32,
    titleSizePx: 14,
    density: "comfortable",
    sectionGapClass: "space-y-6",
  },
  modern: {
    bulletStyle: "dash",
    headerAlign: "left",
    contactLayout: "line",
    heading: { sizePx: 13, weight: 800, trackingEm: 0.12 },
    headingBorder: "bar-left",
    skillsStyle: "pill",
    nameSizePx: 34,
    titleSizePx: 14,
    density: "comfortable",
    sectionGapClass: "space-y-6",
  },
  worded: {
    bulletStyle: "dot",
    headerAlign: "center",
    contactLayout: "line",
    heading: { sizePx: 11.5, weight: 700, trackingEm: 0.22 },
    headingBorder: "underline-accent-thin",
    skillsStyle: "inline",
    nameSizePx: 30,
    titleSizePx: 13,
    density: "comfortable",
    sectionGapClass: "space-y-5",
  },
  balanced: {
    bulletStyle: "dash",
    headerAlign: "center",
    contactLayout: "line",
    heading: { sizePx: 10.5, weight: 800, trackingEm: 0.18 },
    headingBorder: "none",
    skillsStyle: "grid",
    nameSizePx: 26,
    titleSizePx: 12,
    density: "compact",
    sectionGapClass: "space-y-4",
  },
  creative: {
    bulletStyle: "dash",
    headerAlign: "left",
    contactLayout: "line",
    heading: { sizePx: 13, weight: 800, trackingEm: 0.14 },
    headingBorder: "underline-accent-thick",
    skillsStyle: "badge",
    nameSizePx: 34,
    titleSizePx: 14,
    density: "comfortable",
    sectionGapClass: "space-y-6",
  },
  minimal: {
    bulletStyle: "dash",
    headerAlign: "left",
    contactLayout: "line",
    heading: { sizePx: 11, weight: 800, trackingEm: 0.18 },
    headingBorder: "underline-accent-thin",
    skillsStyle: "bullets",
    nameSizePx: 26,
    titleSizePx: 12,
    density: "compact",
    sectionGapClass: "space-y-4",
  },
};

export function getTemplateLayout(template: ResumeTemplateId): TemplateLayout {
  return TEMPLATE_LAYOUTS[template as ResumeTemplateId] ?? TEMPLATE_LAYOUTS.executive;
}
