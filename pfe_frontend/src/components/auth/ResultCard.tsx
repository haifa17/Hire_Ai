import type { ReactNode } from "react";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

const TONES = {
  success: {
    Icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-600",
    role: "status",
  },
  error: {
    Icon: XCircle,
    badgeClass: "bg-red-100 text-red-600",
    role: "alert",
  },
} as const;

type ResultCardProps = {
  tone: keyof typeof TONES;
  heading: string;
  message: string;
  /** Overrides the tone's default icon. */
  icon?: LucideIcon;
  children: ReactNode; // call to action
};

export function ResultCard({
  tone,
  heading,
  message,
  icon,
  children,
}: ResultCardProps) {
  const { Icon: DefaultIcon, badgeClass, role } = TONES[tone];
  const Icon = icon ?? DefaultIcon;

  return (
    <div role={role} className="flex flex-col items-center py-4">
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full ${badgeClass}`}
      >
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">{heading}</h2>
      <p className="mb-8 max-w-70 text-sm text-gray-500">{message}</p>
      {children}
    </div>
  );
}