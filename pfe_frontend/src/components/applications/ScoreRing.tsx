import React, { useId } from "react";

type Props = Readonly<{
  score: number;
  size?: number;
  label?: string;
}>;

export default function ScoreRing({ score, size = 96, label }: Props) {
  const titleId = useId();
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = Math.max(6, Math.round((size / 96) * 8));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  let color = "#ef4444";
  if (safe >= 75) color = "#10b981";
  else if (safe >= 50) color = "#f59e0b";

  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-labelledby={titleId}
      >
        <title id={titleId}>{`${safe}%`}</title>
        <g transform={`translate(${size / 2},${size / 2})`}>
          <circle
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={stroke}
          />
          <circle
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90)"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontSize={Math.round(size / 4)}
            fontWeight={700}
            fill="#0f172a"
          >
            {safe}%
          </text>
        </g>
      </svg>

      {label ? (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          <span className="text-xs text-slate-500">AI score</span>
        </div>
      ) : null}
    </div>
  );
}
