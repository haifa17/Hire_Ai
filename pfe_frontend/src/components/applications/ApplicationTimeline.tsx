import React from "react";

type Step = Readonly<{ key: string; label: string; active?: boolean }>;

export default function ApplicationTimeline({
  steps,
}: Readonly<{ steps: Step[] }>) {
  return (
    <ol className="flex items-center gap-6">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
              s.active
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <span className="text-sm font-semibold">{i + 1}</span>
          </div>

          {i < steps.length - 1 && (
            <div className="h-0.5 w-6 bg-slate-100" aria-hidden />
          )}

          <div className="min-w-0">
            <div
              className={`text-sm font-semibold ${s.active ? "text-slate-900" : "text-slate-500"}`}
            >
              {s.label}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
