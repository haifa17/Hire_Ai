export type ResumeTemplateId =
  | "classic"
  | "modern"
  | "minimal"
  | "creative"
  | "executive"
  | "analyst"
  | "worded"
  | "balanced";

export interface ResumeTemplateTheme {
  primaryColor: string;
  accentColor: string;
  textColor: string;
  pageBackground: string;
  fontFamily: string;
  baseFontSize: number;
  lineHeight: number;
}

export interface ResumeTemplateDefinition {
  id: ResumeTemplateId;
  label: string;
  description: string;
  panelBorderClass: string;
  preview: {
    layout:
      | "classic"
      | "split"
      | "executive"
      | "analyst"
      | "worded"
      | "balanced"
      | "modern"
      | "creative"
      | "minimal";
    headingCase: "normal" | "uppercase";
  };
  theme: ResumeTemplateTheme;
}
