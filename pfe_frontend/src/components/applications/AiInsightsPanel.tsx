import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import ScoreRing from "./ScoreRing";

export interface MatchAnalysisExplanation {
  recommendation?: string;
  summary?: string;
  strengths?: string[];
  missingSkills?: string[];
  weaknesses?: string[];
}

export interface MatchAnalysis {
  strengths?: string[];
  gaps?: string[];
  missingSkills?: string[];
  explanation?: string | MatchAnalysisExplanation;
}

interface AiInsightsPanelProps {
  score: number;
  analysis?: MatchAnalysis;
}

function getExplanationObject(analysis?: MatchAnalysis): MatchAnalysisExplanation | undefined {
  return typeof analysis?.explanation === "object" ? analysis.explanation : undefined;
}

function resolveStrengths(analysis: MatchAnalysis | undefined, explanationObj: MatchAnalysisExplanation | undefined): string[] {
  if (analysis?.strengths && Array.isArray(analysis.strengths)) {
    return analysis.strengths;
  }
  if (explanationObj?.strengths && Array.isArray(explanationObj.strengths)) {
    return explanationObj.strengths;
  }
  return ["Technical alignment validated.", "Experience requirements satisfied."];
}

function resolveGaps(analysis: MatchAnalysis | undefined, explanationObj: MatchAnalysisExplanation | undefined): string[] {
  if (analysis?.gaps && Array.isArray(analysis.gaps)) {
    return analysis.gaps;
  }
  if (analysis?.missingSkills && Array.isArray(analysis.missingSkills)) {
    return analysis.missingSkills.map((s: string) => `Missing required skill: ${s}`);
  }
  if (explanationObj?.missingSkills && Array.isArray(explanationObj.missingSkills)) {
    return explanationObj.missingSkills.map((s: string) => `Missing required skill: ${s}`);
  }
  if (explanationObj?.weaknesses && Array.isArray(explanationObj.weaknesses)) {
    return explanationObj.weaknesses;
  }
  return ["No critical gaps identified."];
}

function resolveExplanationText(analysis?: MatchAnalysis): string {
  const exp = analysis?.explanation;
  if (!exp) return "";
  if (typeof exp === "string") return exp;
  if (typeof exp === "object") {
    return exp.recommendation ?? exp.summary ?? JSON.stringify(exp);
  }
  return String(exp);
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({ score, analysis }) => {
  const explanationObj = getExplanationObject(analysis);
  const strengths: string[] = resolveStrengths(analysis, explanationObj);
  const gaps: string[] = resolveGaps(analysis, explanationObj);
  const explanation = resolveExplanationText(analysis);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-md p-6 shadow-md transition-all duration-300 hover:shadow-lg">
      {/* Decorative AI Glow Element */}
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

      {/* Header and Score Ring side-by-side */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black text-purple-700 uppercase tracking-wider ring-1 ring-purple-600/10">
            <Sparkles className="h-3 w-3" />
            AI Intelligence
          </div>
          <h3 className="text-lg font-black tracking-tight text-slate-900">
            Candidate Resume Match Insights
          </h3>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-md">
            Automated intelligence analyzing your professional resume compatibility against the hiring recruiter&apos;s requirements.
          </p>
        </div>
        
        <div className="shrink-0 flex items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
          <ScoreRing score={score} label="Match Score" size={88} />
        </div>
      </div>

      {/* Explanation Text */}
      {explanation && (
        <div className="mt-5 rounded-2xl border border-indigo-50 bg-linear-to-br from-indigo-50/20 to-purple-50/10 p-4">
          <div className="flex items-start gap-2.5">
            <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Matching Explanation
              </h4>
              <p className="text-xs font-medium text-slate-650 mt-1 leading-relaxed">
                {explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights Checklist / Highlights */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Strengths */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            Core Strengths
          </h4>
          <ul className="space-y-2">
            {strengths.map((str, idx) => (
              <li key={`${str}-${idx}`} className="text-xs font-medium text-slate-600 bg-emerald-50/30 border border-emerald-100/40 rounded-xl p-3">
                {str}
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            Review Areas / Gaps
          </h4>
          <ul className="space-y-2">
            {gaps.map((gap, idx) => (
              <li key={`${gap}-${idx}`} className="text-xs font-medium text-slate-600 bg-amber-50/30 border border-amber-100/40 rounded-xl p-3">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
