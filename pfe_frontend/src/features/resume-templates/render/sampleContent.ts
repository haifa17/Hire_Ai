import { ResumeVisualContent } from "@/domain/models/Resume";
import { ResumeTemplateId } from "@/domain/models/ResumeTemplate";
import { getResumeTemplateTheme } from "@/features/resume-templates/config/resumeTemplates";

/**
 * Realistic placeholder content used to render template thumbnails with the
 * exact same `ResumeDocument` renderer as the real editor — so what a user
 * sees in the picker is guaranteed to match what they get.
 */
export function buildSampleVisualContent(template: ResumeTemplateId): ResumeVisualContent {
  return {
    editorVersion: 1,
    photoUrl: "",
    photoSettings: { size: 96, shape: "rounded", position: "right" },
    header: {
      fullName: "Alex Morgan",
      professionalTitle: "Senior Product Designer",
      email: "alex.morgan@email.com",
      phone: "+1 555 010 2030",
      address: "San Francisco, CA",
      socialLinks: [{ id: "li", network: "linkedin", url: "linkedin.com/in/alexmorgan", label: "linkedin.com/in/alexmorgan" }],
      alignment: "auto",
      contactOrder: ["email", "phone", "address"],
    },
    theme: {
      template,
      ...getResumeTemplateTheme(template),
    },
    sections: [
      {
        id: "summary",
        title: "Professional Summary",
        type: "summary",
        content:
          "Product designer with 8+ years crafting user-centered experiences for B2B SaaS platforms, leading design systems and cross-functional teams.",
        items: [],
      },
      {
        id: "experience",
        title: "Experience",
        type: "experience",
        content: "",
        items: [
          "Senior Product Designer - Northwind Labs | San Francisco, CA | 2021 - Present\n- Led redesign of core dashboard, improving task completion by 34%\n- Built and scaled a design system adopted across 6 product teams",
          "Product Designer - Bright Analytics | Austin, TX | 2018 - 2021\n- Shipped 12 major features from research to launch",
        ],
      },
      {
        id: "education",
        title: "Education",
        type: "education",
        content: "",
        items: ["B.A. Interaction Design - Rhode Island School of Design | 2014 - 2018"],
      },
      {
        id: "skills",
        title: "Skills",
        type: "skills",
        content: "",
        items: ["Figma - Expert", "Design Systems - Advanced", "User Research - Advanced", "Prototyping - Expert"],
      },
    ],
  };
}
