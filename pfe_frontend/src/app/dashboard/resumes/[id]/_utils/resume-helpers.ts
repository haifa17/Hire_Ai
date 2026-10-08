import { ResumeSection, SectionType, ResumeVisualContent, PhotoShape, PhotoPosition, DEFAULT_PHOTO_SETTINGS } from "@/domain/models/Resume";
import { ResumeTemplateId } from "@/domain/models/ResumeTemplate";

export function clampPhotoSize(size: number): number {
  return Math.max(72, Math.min(220, Math.round(size)));
}

export function normalizePhotoShape(shape: unknown): PhotoShape {
  if (shape === "square" || shape === "rounded" || shape === "circle") {
    return shape;
  }
  return DEFAULT_PHOTO_SETTINGS.shape;
}

export function normalizePhotoPosition(position: unknown): PhotoPosition {
  if (position === "left" || position === "right") {
    return position;
  }
  return DEFAULT_PHOTO_SETTINGS.position;
}

export function getPhotoShapeClass(shape: PhotoShape): string {
  if (shape === "circle") return "rounded-full";
  if (shape === "square") return "rounded-none";
  return "rounded-2xl";
}

export function mapSkillLevel(level: unknown): string {
  if (typeof level === "number") {
    if (level <= 1) return "Beginner";
    if (level === 2) return "Intermediate";
    if (level === 3) return "Advanced";
    return "Expert";
  }
  if (typeof level === "string") return level;
  return "";
}

export function getStringFromKeys(
  obj: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export function stringifySafe(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map((item) => stringifySafe(item))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

export function formatSkillsItem(obj: Record<string, unknown>): string {
  const name = typeof obj.name === "string" ? obj.name : "";
  const level = mapSkillLevel(obj.level);
  if (name && level) return `${name} - ${level}`;
  return name;
}

export function formatExperienceItem(obj: Record<string, unknown>): string {
  const company = getStringFromKeys(obj, ["company", "employer", "organization"]);
  const position = getStringFromKeys(obj, ["position", "jobTitle", "title"]);
  const location = typeof obj.location === "string" ? obj.location : "";
  const explicitDates = getStringFromKeys(obj, ["dates", "period"]);
  const startDate = getStringFromKeys(obj, ["startDate", "start"]);
  const endDate = getStringFromKeys(obj, ["endDate", "end"], "Present");
  const responsibilities = Array.isArray(obj.responsibilities)
    ? obj.responsibilities.map((item) => stringifySafe(item)).filter(Boolean)
    : [];
  const achievements = Array.isArray(obj.achievements)
    ? obj.achievements.map((item) => stringifySafe(item)).filter(Boolean)
    : [];
  const achievementLines = achievements.length > 0 ? achievements : responsibilities;
  const description = getStringFromKeys(obj, ["description", "summary"], "");
  const head = [position, company].filter(Boolean).join(" - ");
  const dates = explicitDates || (startDate ? `${startDate} to ${endDate}` : "");
  const introLine = [head, location, dates].filter(Boolean).join(" | ");

  if (achievementLines.length > 0) {
    const formattedAchievements = achievementLines
      .map((line: string) => `  - ${line}`)
      .join("\n");
    return [introLine, formattedAchievements].filter(Boolean).join("\n");
  }

  if (description) {
    return [introLine, description].filter(Boolean).join(" | ");
  }

  return introLine;
}

export function formatEducationItem(obj: Record<string, unknown>): string {
  const school = getStringFromKeys(obj, ["school", "institution", "university"]);
  const degree = typeof obj.degree === "string" ? obj.degree : "";
  const field = getStringFromKeys(obj, ["field", "major"]);
  const address = getStringFromKeys(obj, ["address", "location"]);
  const explicitDates = getStringFromKeys(obj, ["dates", "period"]);
  const startDate = typeof obj.startDate === "string" ? obj.startDate : "";
  const endDate = getStringFromKeys(obj, ["endDate", "year"]);
  const grade = typeof obj.grade === "string" ? obj.grade : "";
  const description = typeof obj.description === "string" ? obj.description : "";
  const dates = explicitDates || (startDate || endDate ? [startDate, endDate].filter(Boolean).join(" to ") : "");
  return [degree, field, school, address, dates, grade, description].filter(Boolean).join(" | ");
}

export function formatProjectsItem(obj: Record<string, unknown>): string {
  const title = typeof obj.title === "string" ? obj.title : "";
  const url = typeof obj.url === "string" ? obj.url : "";
  const keywords = typeof obj.keywords === "string" ? obj.keywords : "";
  const description = typeof obj.description === "string" ? obj.description : "";
  // The AI service may store technologies as an array
  const techRaw = obj.technologies;
  const technologies = Array.isArray(techRaw)
    ? (techRaw as unknown[]).map((t) => String(t)).filter(Boolean).join(", ")
    : typeof techRaw === "string"
    ? techRaw
    : "";
  return [title, url, keywords, description, technologies ? `Tech: ${technologies}` : ""].filter(Boolean).join(" | ");
}

export function formatCertificationsItem(obj: Record<string, unknown>): string {
  const name = typeof obj.name === "string" ? obj.name : "";
  const issuer = typeof obj.issuer === "string" ? obj.issuer : "";
  // AI service stores the date under `date`, editor uses `issueDate`
  const issueDate = getStringFromKeys(obj, ["issueDate", "date"]);
  const expiryDate = typeof obj.expiryDate === "string" ? obj.expiryDate : "";
  let dates = issueDate;
  if (expiryDate) dates += ` to ${expiryDate}`;
  const credentialId = typeof obj.credentialId === "string" ? obj.credentialId : "";
  const url = typeof obj.url === "string" ? obj.url : "";
  return [name, issuer, dates, credentialId, url].filter(Boolean).join(" - ");
}

export function formatLanguageItem(obj: Record<string, unknown>): string {
  const name = getStringFromKeys(obj, ["name", "language"]);
  const level = getStringFromKeys(obj, ["level", "proficiency"]);
  return [name, level].filter(Boolean).join(" - ");
}

export function formatSocialLinkItem(obj: Record<string, unknown>): string {
  const platform = getStringFromKeys(obj, ["platform", "name"]);
  const url = getStringFromKeys(obj, ["url", "link"]);
  return [platform, url].filter(Boolean).join(" - ");
}

export function formatGenericItem(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => ({ key, value: stringifySafe(value).trim() }))
    .filter(({ value }) => value !== "")
    .map(({ key, value }) => `${key}: ${value}`)
    .join(" | ");
}

export function formatObjectItem(item: unknown, sectionType: SectionType): string {
  if (item === undefined || item === null) return "";
  if (typeof item !== "object") return stringifySafe(item);
  const obj = item as Record<string, unknown>;

  switch (sectionType) {
    case "skills": return formatSkillsItem(obj) || formatGenericItem(obj);
    case "experience": return formatExperienceItem(obj) || formatGenericItem(obj);
    case "education": return formatEducationItem(obj) || formatGenericItem(obj);
    case "projects": return formatProjectsItem(obj) || formatGenericItem(obj);
    case "certifications": return formatCertificationsItem(obj) || formatGenericItem(obj);
    case "languages": return formatLanguageItem(obj) || formatGenericItem(obj);
    case "socialLinks": return formatSocialLinkItem(obj) || formatGenericItem(obj);
    default: return formatGenericItem(obj);
  }
}

export function prettifyPossibleJsonLine(line: string, sectionType: SectionType): string {
  const trimmed = line.trim();
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return line;

  try {
    const parsed = JSON.parse(trimmed);
    return formatObjectItem(parsed, sectionType);
  } catch {
    return line;
  }
}

export function parseArrayToLines(value: unknown, sectionType: SectionType): string[] {
  let values: unknown[] = [];
  if (Array.isArray(value)) {
    values = value;
  } else if (value && typeof value === "object") {
    values = [value];
  }
  return values
    .map((item) => {
      if (typeof item === "string") return prettifyPossibleJsonLine(item, sectionType);
      if (item && typeof item === "object") return formatObjectItem(item, sectionType);
      return stringifySafe(item);
    })
    .filter((line) => line.trim() !== "");
}

export function resolvePhotoUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${process.env.NEXT_PUBLIC_API_URL || ""}${url}`;
  return `${process.env.NEXT_PUBLIC_API_URL || ""}/${url}`;
}

export function createSection(title: string, type: SectionType, content = "", items: string[] = []): ResumeSection {
  return {
    id: crypto.randomUUID(),
    title,
    type,
    content,
    items,
  };
}

/**
 * Maps an AI-generated resume (e.g. from the Python ai-service) into the editor's
 * internal format.  The AI model stores contact info under `personalInfo` and
 * social links at the root, while the editor expects a `header` object.
 */
function normalizeRawAiData(data: Record<string, unknown>): Record<string, unknown> {
  // Already in editor format – nothing to do.
  if (data.editorVersion === 1) return data;

  const personalInfo =
    data.personalInfo && typeof data.personalInfo === "object"
      ? (data.personalInfo as Record<string, unknown>)
      : {};

  // Build a `header` block from AI fields if it is missing or empty.
  const hasHeader =
    data.header &&
    typeof data.header === "object" &&
    Object.keys(data.header as object).length > 0;

  if (!hasHeader) {
    const rawSocialLinks = Array.isArray(data.socialLinks) ? data.socialLinks : [];
    const mappedSocialLinks = (rawSocialLinks as Record<string, unknown>[]).map(
      (sl, i) => ({
        id: String(i),
        network: String(sl.platform ?? sl.name ?? ""),
        url: String(sl.url ?? sl.link ?? ""),
        label: String(sl.platform ?? sl.name ?? ""),
        showIcon: true,
      })
    );

    data = {
      ...data,
      header: {
        fullName: personalInfo.name ?? personalInfo.fullName ?? "",
        professionalTitle:
          personalInfo.professionalTitle ??
          personalInfo.title ??
          personalInfo.jobTitle ??
          "",
        email: personalInfo.email ?? "",
        phone: personalInfo.phone ?? personalInfo.mobile ?? "",
        address: personalInfo.location ?? personalInfo.address ?? "",
        socialLinks: mappedSocialLinks,
        alignment: "auto",
        contactOrder: ["email", "phone", "address"],
      },
    };
  }

  // Map `professionalSummary` → summary key that the section builder reads.
  if (!data.summary && data.professionalSummary) {
    data = { ...data, summary: data.professionalSummary };
  }

  return data;
}

export function buildInitialVisualContent(
  raw: unknown,
  fallbackHeader: ResumeVisualContent["header"],
  profilePhoto: string
): ResumeVisualContent {
  const rawData = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data = normalizeRawAiData(rawData);

  const theme = (data.theme && typeof data.theme === "object" ? data.theme : {}) as Record<string, unknown>;
  const header = (data.header && typeof data.header === "object" ? data.header : {}) as Record<string, unknown>;
  const photoSettings = (data.photoSettings && typeof data.photoSettings === "object" ? data.photoSettings : {}) as Record<string, unknown>;
  const sectionsData = Array.isArray(data.sections) ? data.sections : [];

  const visualHeader: ResumeVisualContent["header"] = {
    fullName: readFirstString(header, ["fullName", "name"]) || fallbackHeader.fullName,
    professionalTitle: readFirstString(header, ["professionalTitle", "title", "jobTitle"]) || fallbackHeader.professionalTitle,
    email: readFirstString(header, ["email"]) || fallbackHeader.email,
    phone: readFirstString(header, ["phone", "mobile"]) || fallbackHeader.phone,
    address: readFirstString(header, ["address", "location"]) || fallbackHeader.address,
    socialLinks: Array.isArray(header.socialLinks)
      ? (header.socialLinks as ResumeVisualContent["header"]["socialLinks"])
      : fallbackHeader.socialLinks,
    alignment: (typeof header.alignment === "string" ? header.alignment : undefined) as
      | ResumeVisualContent["header"]["alignment"]
      | undefined ?? fallbackHeader.alignment,
    contactOrder: Array.isArray(header.contactOrder)
      ? (header.contactOrder as string[])
      : fallbackHeader.contactOrder,
  };

  const sections: ResumeSection[] = sectionsData.map((raw) => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
      id: typeof s.id === "string" && s.id ? s.id : crypto.randomUUID(),
      title: typeof s.title === "string" && s.title ? s.title : "Untitled Section",
      type: (typeof s.type === "string" && s.type ? s.type : "custom") as SectionType,
      content: typeof s.content === "string" ? s.content : "",
      items: Array.isArray(s.items) ? (s.items as string[]) : [],
    };
  });

  if (sections.length === 0) {
    const summary = readFirstString(data, ["summary", "about", "objective"]);
    if (summary) sections.push(createSection("Professional Summary", "summary", summary));

    const experience = readFirstArrayOrObject(data, ["experience", "work", "history"]);
    if (experience) sections.push(createSection("Experience", "experience", "", parseArrayToLines(experience, "experience")));

    const education = readFirstArrayOrObject(data, ["education", "studies", "academic"]);
    if (education) sections.push(createSection("Education", "education", "", parseArrayToLines(education, "education")));

    const skills = readFirstArrayOrObject(data, ["skills", "competencies"]);
    if (skills) sections.push(createSection("Skills", "skills", "", parseArrayToLines(skills, "skills")));

    const projects = readFirstArrayOrObject(data, ["projects"]);
    if (projects) sections.push(createSection("Projects", "projects", "", parseArrayToLines(projects, "projects")));

    const certifications = readFirstArrayOrObject(data, ["certifications", "awards"]);
    if (certifications) sections.push(createSection("Certifications", "certifications", "", parseArrayToLines(certifications, "certifications")));

    const languages = readFirstArrayOrObject(data, ["languages"]);
    if (languages) sections.push(createSection("Languages", "languages", "", parseArrayToLines(languages, "languages")));
  }

  return {
    editorVersion: 1,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : profilePhoto,
    photoSettings: {
      size: typeof photoSettings.size === "number" ? photoSettings.size : DEFAULT_PHOTO_SETTINGS.size,
      shape: normalizePhotoShape(photoSettings.shape),
      position: normalizePhotoPosition(photoSettings.position),
    },
    header: visualHeader,
    theme: {
      template: (typeof theme.template === "string" ? (theme.template as ResumeTemplateId) : undefined) || "executive",
      primaryColor: (typeof theme.primaryColor === "string" ? theme.primaryColor : undefined) || "#1E3A8A",
      accentColor: (typeof theme.accentColor === "string" ? theme.accentColor : undefined) || "#111827",
      textColor: (typeof theme.textColor === "string" ? theme.textColor : undefined) || "#111827",
      pageBackground: (typeof theme.pageBackground === "string" ? theme.pageBackground : undefined) || "#FFFFFF",
      fontFamily: (typeof theme.fontFamily === "string" ? theme.fontFamily : undefined) || "Georgia, Cambria, Times New Roman, serif",
      baseFontSize: typeof theme.baseFontSize === "number" ? theme.baseFontSize : 15,
      lineHeight: typeof theme.lineHeight === "number" ? theme.lineHeight : 1.55,
    },
    sections,
    rawSource: (data.rawSource ?? raw) as ResumeVisualContent["rawSource"],
  };
}

export function splitSkillItem(item: string) {
  const [name, level] = item.split(" - ").map(s => s.trim());
  return { name: name || "", level: level || "" };
}

export function formatSkillItem(name: string, level: string) {
  if (name && level) return `${name} - ${level}`;
  return name;
}

export function splitLanguageItem(item: string) {
  const [name, level] = item.split(" - ").map(s => s.trim());
  return { name: name || "", level: level || "" };
}

export function formatLanguageItemString(name: string, level: string) {
  if (name && level) return `${name} - ${level}`;
  return name;
}

export function readFirstString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function readFirstArrayOrObject(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return value;
  }
  return undefined;
}
