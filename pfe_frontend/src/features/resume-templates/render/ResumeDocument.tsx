import React from "react";
import { ResumeVisualContent, ResumeSection } from "@/domain/models/Resume";
import { getResumeTemplatePanelBorderClass } from "@/features/resume-templates/config/resumeTemplates";
import { prettifyPossibleJsonLine } from "@/app/dashboard/resumes/[id]/_utils/resume-helpers";
import { getTemplateLayout, TemplateLayout } from "./templateLayout";
import {
  Linkedin,
  Github,
  Twitter,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

/**
 * Single source of truth for rendering a resume document.
 *
 * Used both for the real, full-size A4 preview in the editor and — scaled down
 * via CSS `transform` — for the miniature template picker cards. This keeps the
 * thumbnail a viewer chooses always identical to what they actually get.
 */

export interface ResumeDocumentProps {
  readonly visualContent: ResumeVisualContent;
  readonly showPhoto?: boolean;
  readonly cardRef?: React.RefObject<HTMLElement | null>;
  /** When true, strips interactive bits (links become plain text) — used for thumbnails. */
  readonly staticMode?: boolean;
}

// ─── Social icon ─────────────────────────────────────────────────────────────
function SocialIcon({ network }: { readonly network: string }) {
  const n = network.toLowerCase();
  if (n.includes("linkedin")) return <Linkedin className="h-3 w-3" />;
  if (n.includes("github")) return <Github className="h-3 w-3" />;
  if (n.includes("twitter") || n.includes("x.com")) return <Twitter className="h-3 w-3" />;
  return <Globe className="h-3 w-3" />;
}

// ─── Contact chip ──────────────────────────────────────────────────────────
interface ContactItem {
  id: string;
  icon?: React.ReactNode;
  text: React.ReactNode;
}

function buildContactItems(
  header: ResumeVisualContent["header"],
  staticMode: boolean,
): ContactItem[] {
  const base: ContactItem[] = [
    ...(header.email
      ? [{ id: "email", icon: <Mail className="h-3 w-3 shrink-0" />, text: <span>{header.email}</span> }]
      : []),
    ...(header.phone
      ? [{ id: "phone", icon: <Phone className="h-3 w-3 shrink-0" />, text: <span>{header.phone}</span> }]
      : []),
    ...(header.address
      ? [{ id: "address", icon: <MapPin className="h-3 w-3 shrink-0" />, text: <span>{header.address}</span> }]
      : []),
    ...(header.socialLinks || [])
      .filter((l) => l.url)
      .map((link) => ({
        id: link.id,
        icon: link.showIcon !== false ? <SocialIcon network={link.network} /> : null,
        text: staticMode ? (
          <span>{link.label || link.url.replace(/^https?:\/\//, "")}</span>
        ) : (
          <a
            href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {link.label || link.url.replace(/^https?:\/\//, "")}
          </a>
        ),
      })),
  ];

  const order = header.contactOrder || ["email", "phone", "address"];
  return [...base].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function firstString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}

interface ExperienceParsed {
  jobTitle: string;
  companyName: string;
  location: string;
  datesText: string;
  details: string[];
}

function parseExperienceFromJson(obj: Record<string, unknown>): ExperienceParsed {
  const result: ExperienceParsed = {
    jobTitle: firstString(obj.position, obj.jobTitle, obj.title),
    companyName: firstString(obj.company, obj.employer, obj.organization),
    location: firstString(obj.location, obj.address),
    datesText: "",
    details: [],
  };

  const startDate = firstString(obj.startDate, obj.start);
  const endDate = firstString(obj.endDate, obj.end) || (startDate ? "Present" : "");
  const datesOrPeriod = firstString(obj.dates, obj.period);
  if (datesOrPeriod) {
    result.datesText = datesOrPeriod;
  } else if (startDate) {
    const endDateSuffix = endDate ? ` – ${endDate}` : "";
    result.datesText = `${startDate}${endDateSuffix}`;
  }

  const resps = Array.isArray(obj.responsibilities) ? obj.responsibilities : [];
  const achs = Array.isArray(obj.achievements) ? obj.achievements : [];
  const desc = typeof obj.description === "string" ? obj.description : "";

  const detailList = [...achs, ...resps].map(String).filter(Boolean);
  if (detailList.length > 0) {
    result.details = detailList;
  } else if (desc) {
    result.details = [desc];
  }
  return result;
}

function parseExperienceHeaderLine(head: string, result: ExperienceParsed): void {
  const dashIdx = head.lastIndexOf(" - ");
  if (dashIdx > 0) {
    result.jobTitle = head.slice(0, dashIdx).trim();
    result.companyName = head.slice(dashIdx + 3).trim();
  } else {
    result.jobTitle = head;
  }
}

function assignExperiencePart(p: string, result: ExperienceParsed): void {
  const isDate = /(?:19|20)\d{2}|present|current/i.test(p);
  if (isDate && !result.datesText) {
    result.datesText = p;
  } else if (!result.location) {
    result.location = p;
  } else {
    result.details.push(p);
  }
}

function parseExperienceFromText(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): ExperienceParsed {
  const result: ExperienceParsed = {
    jobTitle: "",
    companyName: "",
    location: "",
    datesText: "",
    details: [],
  };

  const formatted = prettify(rawItem, "experience");
  const lines = formatted.split("\n");
  const headerLine = lines[0] || "";
  result.details = lines.slice(1).map((l) => l.trim()).filter(Boolean);

  const parts = headerLine.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    parseExperienceHeaderLine(parts[0], result);
  }

  for (let i = 1; i < parts.length; i++) {
    assignExperiencePart(parts[i], result);
  }

  return result;
}

function parseExperienceItemData(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): ExperienceParsed {
  const trimmed = rawItem.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return parseExperienceFromJson(JSON.parse(trimmed));
    } catch {
      // Fallback below
    }
  }

  return parseExperienceFromText(rawItem, prettify);
}

interface EducationParsed {
  degree: string;
  field: string;
  school: string;
  location: string;
  datesText: string;
  details: string[];
}

function parseEducationFromJson(obj: Record<string, unknown>): EducationParsed {
  const result: EducationParsed = {
    degree: firstString(obj.degree, obj.level),
    field: firstString(obj.field, obj.major, obj.fieldOfStudy),
    school: firstString(obj.school, obj.institution, obj.university),
    location: "",
    datesText: "",
    details: [],
  };

  const locationParts = [obj.city, obj.country].filter((v): v is string => typeof v === "string" && v.length > 0);
  result.location = locationParts.length > 0 ? locationParts.join(", ") : firstString(obj.address, obj.location);

  const startDate = firstString(obj.startDate, obj.startYear, obj.start);
  const endDate = firstString(obj.endDate, obj.endYear, obj.end, obj.year);
  if (startDate || endDate) {
    const endDateSuffix = endDate ? ` – ${endDate}` : "";
    result.datesText = `${startDate}${endDateSuffix}`;
  }

  if (typeof obj.description === "string" && obj.description) {
    result.details = [obj.description];
  }
  return result;
}

function parseEducationHeaderLine(head: string, result: EducationParsed): void {
  const dashIdx = head.lastIndexOf(" - ");
  if (dashIdx > 0) {
    result.degree = head.slice(0, dashIdx).trim();
    result.school = head.slice(dashIdx + 3).trim();
  } else {
    result.degree = head;
  }
}

function assignEducationPart(p: string, result: EducationParsed): void {
  const isDate = /(?:19|20)\d{2}|present|current/i.test(p);
  if (isDate && !result.datesText) {
    result.datesText = p;
  } else if (!result.school) {
    result.school = p;
  } else if (!result.location) {
    result.location = p;
  } else {
    result.details.push(p);
  }
}

function parseEducationFromText(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): EducationParsed {
  const result: EducationParsed = {
    degree: "",
    field: "",
    school: "",
    location: "",
    datesText: "",
    details: [],
  };

  const formatted = prettify(rawItem, "education");
  const lines = formatted.split("\n");
  const headerLine = lines[0] || "";
  result.details = lines.slice(1).map((l) => l.trim()).filter(Boolean);

  const parts = headerLine.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    parseEducationHeaderLine(parts[0], result);
  }

  for (let i = 1; i < parts.length; i++) {
    assignEducationPart(parts[i], result);
  }

  return result;
}

function parseEducationItemData(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): EducationParsed {
  const trimmed = rawItem.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return parseEducationFromJson(JSON.parse(trimmed));
    } catch {
      // Fallback below
    }
  }

  return parseEducationFromText(rawItem, prettify);
}

interface ProjectParsed {
  title: string;
  url: string;
  keywords: string[];
  details: string[];
}

function splitProjectKeywords(raw: string): string[] {
  return raw
    .replace(/^(?:tech|technologies|keywords|stack|tools):\s*/i, "")
    .split(/[,•]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function projectTechString(techRaw: unknown): string {
  if (Array.isArray(techRaw)) return techRaw.join(", ");
  return typeof techRaw === "string" ? techRaw : "";
}

function parseProjectFromJson(obj: Record<string, unknown>): ProjectParsed {
  const result: ProjectParsed = {
    title: firstString(obj.title, obj.name),
    url: firstString(obj.url, obj.link, obj.projectUrl),
    keywords: [],
    details: [],
  };

  const techStr = projectTechString(obj.technologies ?? obj.tech);
  const keywordsRaw = obj.keywords ?? obj.tags ?? (techStr || undefined);
  result.keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw.map(String).filter(Boolean)
    : splitProjectKeywords(firstString(keywordsRaw));

  const desc = firstString(obj.description, obj.summary);
  if (desc) result.details = [desc];
  return result;
}

function isProjectUrl(str: string): boolean {
  return (
    /^(?:https?:\/\/|www\.)[^\s]+$/i.test(str) ||
    (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s]*$/i.test(str) && !str.includes(" "))
  );
}

function assignProjectPart(p: string, result: ProjectParsed): void {
  if (isProjectUrl(p) && !result.url) {
    result.url = p;
  } else if (result.keywords.length === 0 && (p.includes(",") || p.split(" ").length <= 4)) {
    result.keywords = splitProjectKeywords(p);
  } else {
    result.details.push(p);
  }
}

function parseProjectFromText(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): ProjectParsed {
  const result: ProjectParsed = { title: "", url: "", keywords: [], details: [] };

  const formatted = prettify(rawItem, "projects");
  const lines = formatted.split("\n");
  const headerLine = lines[0] || "";
  result.details = lines.slice(1).map((l) => l.trim()).filter(Boolean);

  const parts = headerLine.split("|").map((p) => p.trim()).filter(Boolean);
  result.title = parts[0] || "";

  for (let i = 1; i < parts.length; i++) {
    assignProjectPart(parts[i], result);
  }

  return result;
}

function parseProjectItemData(
  rawItem: string,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
): ProjectParsed {
  const trimmed = rawItem.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return parseProjectFromJson(JSON.parse(trimmed));
    } catch {
      // Fallback below
    }
  }

  return parseProjectFromText(rawItem, prettify);
}

const BULLET_GLYPH: Record<TemplateLayout["bulletStyle"], string> = {
  dot: "•",
  dash: "–",
};

// ─── Section items renderer (per-type sub-renderers) ─────────────────────
interface ItemsRenderProps {
  readonly section: ResumeSection;
  readonly accentColor: string;
  readonly textColor: string;
  readonly layout: TemplateLayout;
  readonly prettify: (line: string, sectionType: ResumeSection["type"]) => string;
  readonly staticMode: boolean;
  readonly bullet: string;
  readonly compact: boolean;
}

function FallbackItemRow({
  item,
  section,
  accentColor,
  textColor,
  prettify,
  bullet,
}: {
  item: string;
  section: ResumeSection;
  accentColor: string;
  textColor: string;
  prettify: (line: string, sectionType: ResumeSection["type"]) => string;
  bullet: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-[2px] shrink-0 font-bold" style={{ color: accentColor }}>{bullet}</span>
      <span className="whitespace-pre-wrap break-words font-bold" style={{ color: textColor }}>
        {prettify(item, section.type)}
      </span>
    </div>
  );
}

type BasicItemsRenderProps = Pick<
  ItemsRenderProps,
  "section" | "accentColor" | "textColor" | "prettify" | "bullet" | "compact"
>;

function ExperienceItems({ section, accentColor, textColor, prettify, bullet, compact }: BasicItemsRenderProps) {
  return (
    <div className={`space-y-3 ${compact ? "text-[12px]" : "text-[13.5px]"} leading-[1.55]`}>
      {section.items.map((item, i) => {
        const data = parseExperienceItemData(item, prettify);
        const hasHeaderData = data.jobTitle || data.companyName || data.datesText;

        const rowKey = `${item}-${i}`;

        if (!hasHeaderData) {
          return (
            <FallbackItemRow key={rowKey} item={item} section={section} accentColor={accentColor} textColor={textColor} prettify={prettify} bullet={bullet} />
          );
        }

        return (
          <div key={rowKey} className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 font-bold" style={{ color: accentColor }}>
                {bullet}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3" style={{ color: textColor }}>
                  <div className="font-bold">
                    <span className="font-bold">{data.jobTitle}</span>
                    {data.jobTitle && data.companyName && <span className="font-bold mx-1.5">–</span>}
                    <span className="font-bold">{data.companyName}</span>
                    {data.location && (
                      <span className="font-normal text-xs opacity-75 ml-2">({data.location})</span>
                    )}
                  </div>
                  {data.datesText && (
                    <div className="font-bold text-xs shrink-0" style={{ color: accentColor }}>
                      {data.datesText}
                    </div>
                  )}
                </div>

                {data.details.length > 0 && (
                  <ul className="mt-1 space-y-0.5 opacity-90 font-normal text-[0.95em]">
                    {data.details.map((detail, dIdx) => (
                      <li key={`${detail}-${dIdx}`} className="whitespace-pre-wrap break-words">
                        {detail.startsWith("-") || detail.startsWith("•") ? detail : `• ${detail}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EducationItems({ section, accentColor, textColor, prettify, bullet, compact }: BasicItemsRenderProps) {
  return (
    <div className={`space-y-3 ${compact ? "text-[12px]" : "text-[13.5px]"} leading-[1.55]`}>
      {section.items.map((item, i) => {
        const data = parseEducationItemData(item, prettify);
        const hasHeaderData = data.degree || data.school || data.datesText;

        const rowKey = `${item}-${i}`;

        if (!hasHeaderData) {
          return (
            <FallbackItemRow key={rowKey} item={item} section={section} accentColor={accentColor} textColor={textColor} prettify={prettify} bullet={bullet} />
          );
        }

        return (
          <div key={rowKey} className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 font-bold" style={{ color: accentColor }}>
                {bullet}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3" style={{ color: textColor }}>
                  <div className="font-bold">
                    <span className="font-bold">
                      {data.degree}
                      {data.degree && data.field && <span className="font-normal">{` in ${data.field}`}</span>}
                    </span>
                    {(data.degree || data.field) && data.school && <span className="font-bold mx-1.5">–</span>}
                    <span className="font-bold">{data.school}</span>
                    {data.location && (
                      <span className="font-normal text-xs opacity-75 ml-2">({data.location})</span>
                    )}
                  </div>
                  {data.datesText && (
                    <div className="font-bold text-xs shrink-0" style={{ color: accentColor }}>
                      {data.datesText}
                    </div>
                  )}
                </div>

                {data.details.length > 0 && (
                  <ul className="mt-1 space-y-0.5 opacity-90 font-normal text-[0.95em]">
                    {data.details.map((detail, dIdx) => (
                      <li key={`${detail}-${dIdx}`} className="whitespace-pre-wrap break-words">
                        {detail.startsWith("-") || detail.startsWith("•") ? detail : `• ${detail}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectItems({
  section,
  accentColor,
  textColor,
  prettify,
  staticMode,
  bullet,
  compact,
}: BasicItemsRenderProps & Pick<ItemsRenderProps, "staticMode">) {
  return (
    <div className={`space-y-3 ${compact ? "text-[12px]" : "text-[13.5px]"} leading-[1.55]`}>
      {section.items.map((item, i) => {
        const data = parseProjectItemData(item, prettify);
        const hasHeaderData = data.title || data.url;

        const rowKey = `${item}-${i}`;

        if (!hasHeaderData) {
          return (
            <FallbackItemRow key={rowKey} item={item} section={section} accentColor={accentColor} textColor={textColor} prettify={prettify} bullet={bullet} />
          );
        }

        return (
          <div key={rowKey} className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="mt-[3px] shrink-0 font-bold" style={{ color: accentColor }}>
                {bullet}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3" style={{ color: textColor }}>
                  <span className="font-bold">{data.title}</span>
                  {data.url && (
                    staticMode ? (
                      <span className="text-xs font-medium shrink-0" style={{ color: accentColor }}>
                        Link
                      </span>
                    ) : (
                      <a
                        href={data.url.startsWith("http") ? data.url : `https://${data.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium shrink-0 hover:underline"
                        style={{ color: accentColor }}
                      >
                        Link
                      </a>
                    )
                  )}
                </div>

                {data.keywords.length > 0 && (
                  <p className="mt-1 opacity-80 text-[0.9em]">Keywords: {data.keywords.join(", ")}</p>
                )}

                {data.details.length > 0 && (
                  <ul className="mt-1 space-y-0.5 opacity-90 font-normal text-[0.95em]">
                    {data.details.map((detail, dIdx) => (
                      <li key={`${detail}-${dIdx}`} className="whitespace-pre-wrap break-words">
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillsGrid({ section, textColor }: { readonly section: ResumeSection; readonly textColor: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
      {section.items.map((item, i) => {
        const [label, level] = item.split(" - ").map((p) => p.trim());
        return (
          <div key={`${item}-${i}`} className="flex items-center justify-between gap-2">
            <span className="font-medium" style={{ color: textColor }}>{label || item}</span>
            {level && <span className="text-gray-400 text-[11px]">{level}</span>}
          </div>
        );
      })}
    </div>
  );
}

function SkillsInline({ section, textColor, prettify }: { readonly section: ResumeSection; readonly textColor: string; readonly prettify: (line: string, sectionType: ResumeSection["type"]) => string }) {
  return (
    <p className="text-[13px] leading-relaxed" style={{ color: textColor }}>
      {section.items.map((item, i) => (
        <span key={`${item}-${i}`}>{i > 0 ? "  •  " : ""}{prettify(item, section.type)}</span>
      ))}
    </p>
  );
}

function SkillsBadge({ section, accentColor, textColor, prettify }: { readonly section: ResumeSection; readonly accentColor: string; readonly textColor: string; readonly prettify: (line: string, sectionType: ResumeSection["type"]) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {section.items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-md px-2.5 py-1 text-[12px] font-semibold border"
          style={{ borderColor: `${accentColor}40`, color: textColor, backgroundColor: `${accentColor}12` }}
        >
          {prettify(item, section.type)}
        </span>
      ))}
    </div>
  );
}

function SkillsPill({ section, accentColor, textColor, prettify }: { readonly section: ResumeSection; readonly accentColor: string; readonly textColor: string; readonly prettify: (line: string, sectionType: ResumeSection["type"]) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {section.items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full px-3 py-0.5 text-[12px] font-medium border"
          style={{ borderColor: `${accentColor}40`, color: textColor, backgroundColor: `${accentColor}0A` }}
        >
          {prettify(item, section.type)}
        </span>
      ))}
    </div>
  );
}

function DefaultBulletItems({ section, accentColor, textColor, prettify, bullet, compact }: BasicItemsRenderProps) {
  return (
    <ul className={`space-y-1 ${compact ? "text-[12px]" : "text-[13.5px]"} leading-[1.55]`}>
      {section.items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex gap-2">
          <span className="mt-[2px] shrink-0 font-bold" style={{ color: accentColor }}>{bullet}</span>
          <span className="whitespace-pre-wrap break-words" style={{ color: textColor }}>
            {prettify(item, section.type)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function renderSkillsLike(props: ItemsRenderProps): React.ReactNode {
  const { section, accentColor, textColor, layout, prettify } = props;
  switch (layout.skillsStyle) {
    case "grid":
      return <SkillsGrid section={section} textColor={textColor} />;
    case "inline":
      return <SkillsInline section={section} textColor={textColor} prettify={prettify} />;
    case "badge":
      return <SkillsBadge section={section} accentColor={accentColor} textColor={textColor} prettify={prettify} />;
    case "pill":
      return <SkillsPill section={section} accentColor={accentColor} textColor={textColor} prettify={prettify} />;
    default:
      return null;
  }
}

function SectionItems(props: {
  readonly section: ResumeSection;
  readonly accentColor: string;
  readonly textColor: string;
  readonly layout: TemplateLayout;
  readonly prettify: (line: string, sectionType: ResumeSection["type"]) => string;
  readonly staticMode: boolean;
}) {
  const { section, layout } = props;
  if (section.items.length === 0) return null;
  const bullet = BULLET_GLYPH[layout.bulletStyle];
  const compact = layout.density === "compact";
  const itemsProps: ItemsRenderProps = { ...props, bullet, compact };

  if (section.type === "experience") return <ExperienceItems {...itemsProps} />;
  if (section.type === "education") return <EducationItems {...itemsProps} />;
  if (section.type === "projects") return <ProjectItems {...itemsProps} />;

  const isSkillsLike = section.type === "skills" || section.type === "languages";
  if (isSkillsLike) {
    const skillsEl = renderSkillsLike(itemsProps);
    if (skillsEl !== null) return skillsEl;
  }

  return <DefaultBulletItems {...itemsProps} />;
}

function SectionHeading({ title, primaryColor, layout }: { readonly title: string; readonly primaryColor: string; readonly layout: TemplateLayout }) {
  return (
    <h2
      className="uppercase"
      style={{
        color: primaryColor,
        fontSize: `${layout.heading.sizePx}px`,
        fontWeight: layout.heading.weight,
        letterSpacing: `${layout.heading.trackingEm}em`,
      }}
    >
      {title}
    </h2>
  );
}

function headingBorderWrapperStyle(border: HeadingBorderKind, primaryColor: string, accentColor: string): React.CSSProperties {
  switch (border) {
    case "underline-primary":
      return { borderBottom: `1.5px solid ${primaryColor}` };
    case "underline-accent-thin":
      return { borderBottom: `1px solid ${accentColor}60` };
    case "underline-accent-thick":
      return { borderBottom: `2.5px solid ${accentColor}` };
    case "underline-accent-dotted":
      return { borderBottom: `1px dotted ${accentColor}60` };
    default:
      return {};
  }
}

type HeadingBorderKind = TemplateLayout["headingBorder"];

function renderSection(
  section: ResumeSection,
  theme: ResumeVisualContent["theme"],
  layout: TemplateLayout,
  prettify: (line: string, sectionType: ResumeSection["type"]) => string,
  staticMode: boolean,
) {
  const compact = layout.density === "compact";
  const content = section.content ? (
    <p
      className={`mb-2 whitespace-pre-wrap break-words leading-relaxed ${compact ? "text-[12px]" : "text-[13.5px]"}`}
      style={{ color: theme.textColor }}
    >
      {section.content}
    </p>
  ) : null;

  const items = (
    <SectionItems
      section={section}
      accentColor={theme.accentColor}
      textColor={theme.textColor}
      layout={layout}
      prettify={prettify}
      staticMode={staticMode}
    />
  );

  const heading = <SectionHeading title={section.title} primaryColor={theme.primaryColor} layout={layout} />;

  if (layout.headingBorder === "bar-left") {
    return (
      <section key={section.id} className="space-y-2">
        <div className="flex items-center gap-2.5 pb-1">
          <div className="h-4 w-1 rounded-full" style={{ backgroundColor: theme.accentColor }} />
          {heading}
        </div>
        {content}
        {items}
      </section>
    );
  }

  if (layout.headingBorder === "line-right") {
    return (
      <section key={section.id} className="space-y-2">
        <div className="flex items-center gap-3">
          {heading}
          <div className="h-px flex-1" style={{ background: `${theme.accentColor}40` }} />
        </div>
        {content}
        {items}
      </section>
    );
  }

  if (layout.contactLayout === "sideColumn") {
    // Analyst-style: heading + hairline underneath, kept in normal flow.
    return (
      <section key={section.id} className="space-y-2">
        <div className="pb-1" style={headingBorderWrapperStyle(layout.headingBorder, theme.primaryColor, theme.accentColor)}>
          {heading}
        </div>
        {content}
        {items}
      </section>
    );
  }

  if (layout.headingBorder === "none") {
    // Balanced: two-column, heading on the left rail.
    return (
      <section
        key={section.id}
        className="grid gap-4 pb-4"
        style={{ gridTemplateColumns: "120px 1fr", borderBottom: `1px solid ${theme.accentColor}22` }}
      >
        <div style={{ borderRight: `1px solid ${theme.accentColor}22`, paddingRight: "12px" }}>{heading}</div>
        <div>
          {content}
          {items}
        </div>
      </section>
    );
  }

  return (
    <section key={section.id} className="space-y-2">
      <div className="pb-1" style={headingBorderWrapperStyle(layout.headingBorder, theme.primaryColor, theme.accentColor)}>
        {heading}
      </div>
      {content}
      {items}
    </section>
  );
}

export function ResumeDocument({
  visualContent,
  showPhoto = false,
  cardRef,
  staticMode = false,
}: ResumeDocumentProps) {
  const { theme, header, sections, photoUrl, photoSettings } = visualContent;
  const layout = getTemplateLayout(theme.template);
  const templateBorderClass = getResumeTemplatePanelBorderClass(theme.template);
  const prettify = prettifyPossibleJsonLine;

  const contactItems = buildContactItems(header, staticMode);
  const isSideColumn = layout.contactLayout === "sideColumn";

  let photoBorderRadius: string;
  if (photoSettings.shape === "circle") {
    photoBorderRadius = "50%";
  } else if (photoSettings.shape === "rounded") {
    photoBorderRadius = "12px";
  } else {
    photoBorderRadius = "4px";
  }

  const photoEl =
    showPhoto && photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- this document is rendered to canvas/PDF (html2canvas), which requires a plain <img> in the DOM
      <img
        src={photoUrl}
        alt="Profile"
        style={{
          width: photoSettings.size,
          height: photoSettings.size,
          objectFit: "cover",
          borderRadius: photoBorderRadius,
          flexShrink: 0,
        }}
      />
    ) : null;

  const resolvedAlign: "left" | "center" | "right" =
    header.alignment && header.alignment !== "auto" ? header.alignment : layout.headerAlign;

  let contactLineJustifyContent: string;
  if (resolvedAlign === "center") {
    contactLineJustifyContent = "center";
  } else if (resolvedAlign === "right") {
    contactLineJustifyContent = "flex-end";
  } else {
    contactLineJustifyContent = "flex-start";
  }

  const contactLineEl =
    contactItems.length > 0 && !isSideColumn ? (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5"
        style={{
          fontSize: layout.density === "compact" ? "11px" : "12px",
          color: `${theme.textColor}CC`,
          justifyContent: contactLineJustifyContent,
        }}
      >
        {contactItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <span style={{ opacity: 0.4, userSelect: "none" }}>|</span>}
            <span className="flex items-center gap-1">
              {item.icon && <span style={{ opacity: 0.7 }}>{item.icon}</span>}
              {item.text}
            </span>
          </React.Fragment>
        ))}
      </div>
    ) : null;

  const sideContactEl =
    isSideColumn && contactItems.length > 0 ? (
      <div className="flex flex-col gap-2 text-[12px] text-right" style={{ color: theme.textColor }}>
        {contactItems.map((item) => (
          <div key={item.id} className="flex items-center justify-end gap-1.5">
            {item.icon && <span style={{ color: theme.accentColor }}>{item.icon}</span>}
            {item.text}
          </div>
        ))}
      </div>
    ) : null;

  const nameFontSize = `${layout.nameSizePx}px`;
  const titleFontSize = `${layout.titleSizePx}px`;

  return (
    <article
      ref={cardRef as React.RefObject<HTMLElement>}
      className={`relative bg-white shadow-[0_4px_40px_rgba(0,0,0,0.18),0_1px_6px_rgba(0,0,0,0.08)] ${templateBorderClass}`}
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: layout.density === "compact" ? "44px 52px" : "52px 60px",
        fontFamily: theme.fontFamily,
        fontSize: `${theme.baseFontSize}px`,
        lineHeight: theme.lineHeight,
        color: theme.textColor,
        background: theme.pageBackground || "#ffffff",
        boxSizing: "border-box",
      }}
    >
      {!staticMode && (
        <div
          className="page-break-guide pointer-events-none"
          style={{
            position: "absolute",
            top: "1123px",
            left: 0,
            right: 0,
            borderTop: "2px dashed rgba(59,130,246,0.3)",
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              background: "#EFF6FF",
              color: "#3B82F6",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "2px 10px",
              borderRadius: "0 0 6px 6px",
              transform: "translateY(-1px)",
            }}
          >
            Page 2 ↓
          </span>
        </div>
      )}

      <header
        className="mb-6"
        style={{
          paddingBottom: layout.density === "compact" ? "18px" : "22px",
          borderBottom: `2px solid ${layout.headingBorder === "none" ? theme.accentColor : theme.primaryColor}25`,
          ...(isSideColumn
            ? { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: "24px" }
            : { display: "flex", alignItems: "center", gap: "20px" }),
        }}
      >
        {showPhoto && photoUrl && photoSettings.position === "left" && !isSideColumn && (
          <div style={{ flexShrink: 0 }}>{photoEl}</div>
        )}

        <div style={{ flex: 1, textAlign: resolvedAlign }}>
          {showPhoto && photoUrl && photoSettings.position === "right" && !isSideColumn && resolvedAlign === "right" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>{photoEl}</div>
          )}

          <h1
            style={{
              fontSize: nameFontSize,
              fontWeight: 800,
              color: theme.primaryColor,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {header.fullName || "Your Name"}
          </h1>

          {header.professionalTitle && (
            <p
              style={{
                fontSize: titleFontSize,
                fontWeight: 500,
                color: theme.accentColor,
                marginTop: "4px",
                letterSpacing: layout.headerAlign === "center" ? "0.02em" : "0",
              }}
            >
              {header.professionalTitle}
            </p>
          )}

          {contactLineEl}
        </div>

        {isSideColumn && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
            {showPhoto && photoUrl && <div>{photoEl}</div>}
            {sideContactEl}
          </div>
        )}

        {showPhoto && photoUrl && photoSettings.position === "right" && !isSideColumn && resolvedAlign !== "right" && (
          <div style={{ flexShrink: 0, marginLeft: "auto" }}>{photoEl}</div>
        )}
      </header>

      <main className={layout.sectionGapClass}>
        {sections.map((section) => renderSection(section, theme, layout, prettify, staticMode))}
      </main>
    </article>
  );
}
