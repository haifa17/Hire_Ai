import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleAlert, CircleCheck, FileText, RotateCcw } from "lucide-react";
import ScoreRing from "@/components/applications/ScoreRing";
import {
  MATCH_CRITERIA,
  type MatchCriterion,
  type MatchOfferResponse,
} from "@/domain/models/OfferMatch";
import { cn } from "@/lib/utils";

const STRONG_MATCH = 75;
const GOOD_MATCH = 50;

function verdictKey(score: number) {
  if (score >= STRONG_MATCH) return "strong" as const;
  if (score >= GOOD_MATCH) return "good" as const;
  return "weak" as const;
}

function CriterionRow({
  criterion,
  value,
}: Readonly<{ criterion: MatchCriterion; value: number | null | undefined }>) {
  const t = useTranslations("offerMatch.result");
  const percent = typeof value === "number" ? Math.round(value * 100) : null;

  return (
    <li className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_3rem]">
      <span className="truncate text-slate-600">{t(`criteria.${criterion}`)}</span>
      {percent === null ? (
        <span className="col-span-2 text-xs text-slate-400" title={t("notEvaluatedHint")}>
          {t("notEvaluated")}
        </span>
      ) : (
        <>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-blue-600"
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="text-right font-medium tabular-nums text-slate-900">{percent}%</span>
        </>
      )}
    </li>
  );
}

function SkillList({
  title,
  skills,
  tone,
}: Readonly<{ title: string; skills: string[]; tone: "match" | "missing" }>) {
  if (skills.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {skills.map((skill, index) => (
          <li
            key={`${index}-${skill}`}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
              tone === "match"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-800 ring-amber-100",
            )}
          >
            {skill}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointList({
  title,
  items,
  tone,
}: Readonly<{ title: string; items: string[]; tone: "strength" | "gap" }>) {
  if (items.length === 0) return null;
  const Icon = tone === "strength" ? CircleCheck : CircleAlert;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2.5 space-y-2">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                tone === "strength" ? "text-emerald-600" : "text-amber-600",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type MatchResultProps = {
  response: MatchOfferResponse;
  onReset: () => void;
};

export function MatchResult({ response, onReset }: MatchResultProps) {
  const t = useTranslations("offerMatch.result");
  const { offer, result } = response;
  const score = typeof result.globalScore === "number" ? result.globalScore : null;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {score !== null && <ScoreRing score={score} size={96} />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{t("heading")}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {t("for", { title: offer.title })}
            {offer.company && (
              <span className="font-normal text-slate-500"> {t("at", { company: offer.company })}</span>
            )}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {score === null ? t("noScore") : t(`verdict.${verdictKey(score)}`)}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">{t("breakdown")}</h3>
        <ul className="mt-3 space-y-2.5">
          {MATCH_CRITERIA.map((criterion) => (
            <CriterionRow key={criterion} criterion={criterion} value={result.breakdown?.[criterion]} />
          ))}
        </ul>
      </div>

      {/* Skills */}
      {((result.matchedSkills?.length ?? 0) > 0 || (result.missingSkills?.length ?? 0) > 0) && (
        <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <SkillList title={t("matchedSkills")} skills={result.matchedSkills ?? []} tone="match" />
          <SkillList title={t("missingSkills")} skills={result.missingSkills ?? []} tone="missing" />
        </div>
      )}

      {/* Strengths & gaps */}
      {((result.strengths?.length ?? 0) > 0 || (result.gaps?.length ?? 0) > 0) && (
        <div className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <PointList title={t("strengths")} items={result.strengths ?? []} tone="strength" />
          <PointList title={t("gaps")} items={result.gaps ?? []} tone="gap" />
        </div>
      )}

      {result.explanation && (
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">{t("summary")}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {result.explanation}
          </p>
        </div>
      )}

      {/* Next steps */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap">
        {offer.id ? (
          <>
            <Link
              href={`/dashboard/candidate/apply?jobId=${offer.id}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("apply")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/dashboard/candidate/jobs/${offer.id}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("viewOffer")}
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard/resumes/create"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            {t("tailorCv")}
          </Link>
        )}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 sm:ml-auto"
        >
          <RotateCcw className="h-4 w-4" />
          {t("newMatch")}
        </button>
      </div>
    </div>
  );
}
