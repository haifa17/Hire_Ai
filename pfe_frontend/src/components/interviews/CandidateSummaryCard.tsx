import { Mail, MapPin, Phone, Sparkles } from "lucide-react";

type CandidateSummaryCardProps = Readonly<{
  fullName: string;
  matchScore: number;
  skills: unknown[];
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  professionalSummary?: string | null;
  appliedJobTitle?: string | null;
}>;

type NormalizedSkill = {
  name: string;
  level?: string;
};

function normalizeSkillLevel(level: unknown): string | undefined {
  if (typeof level === "number") {
    if (level <= 1) return "Beginner";
    if (level === 2) return "Intermediate";
    if (level === 3) return "Advanced";
    return "Expert";
  }

  if (typeof level !== "string") {
    return undefined;
  }

  const trimmed = level.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  if (["beginner", "basic", "junior"].includes(normalized)) return "Beginner";
  if (["intermediate", "intermediaire", "intermédiaire"].includes(normalized)) return "Intermediate";
  if (["advanced", "avancé", "avance"].includes(normalized)) return "Advanced";
  if (["expert", "senior", "pro"].includes(normalized)) return "Expert";

  return trimmed;
}

function addNormalizedSkill(
  skills: NormalizedSkill[],
  seen: Set<string>,
  name: string,
  level?: string,
): void {
  const key = `${name.toLowerCase()}|${level?.toLowerCase() ?? ""}`;
  if (seen.has(key)) return;

  seen.add(key);
  skills.push({ name, level });
}

function getSkillName(record: Record<string, unknown>): string | undefined {
  const preferred =
    record.label ?? record.name ?? record.title ?? record.skill ?? record.value;

  if (typeof preferred === "string" || typeof preferred === "number") {
    const trimmed = String(preferred).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function collectSkillValues(
  value: unknown,
  skills: NormalizedSkill[],
  seen: Set<string>,
): void {
  if (value == null) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) addNormalizedSkill(skills, seen, trimmed);
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    addNormalizedSkill(skills, seen, String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSkillValues(item, skills, seen));
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const name = getSkillName(record);

  if (name) {
    addNormalizedSkill(
      skills,
      seen,
      name,
      normalizeSkillLevel(record.level ?? record.proficiency),
    );
    return;
  }

  Object.values(record).forEach((item) => collectSkillValues(item, skills, seen));
}

function normalizeSkills(values: unknown[]): NormalizedSkill[] {
  const skills: NormalizedSkill[] = [];
  const seen = new Set<string>();

  values.forEach((value) => collectSkillValues(value, skills, seen));

  return skills;
}

export function CandidateSummaryCard({
  fullName,
  skills,
  email,
  phone,
  location,
  professionalSummary,
  appliedJobTitle,
}: CandidateSummaryCardProps) {
  const normalizedSkills = normalizeSkills(skills);

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
            Candidate summary
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {fullName}
          </h2>
        </div>
       
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {appliedJobTitle ? (
          <p>
            <span className="font-medium text-slate-900">Applied role:</span>{" "}
            {appliedJobTitle}
          </p>
        ) : null}

        {email ? (
          <p className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            {email}
          </p>
        ) : null}

        {phone ? (
          <p className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            {phone}
          </p>
        ) : null}

        {location ? (
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {location}
          </p>
        ) : null}
      </div>

      {professionalSummary ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Professional summary
          </p>
          <p className="mt-1 whitespace-pre-wrap leading-6">
            {professionalSummary}
          </p>
        </div>
      ) : null}

     
    </aside>
  );
}
