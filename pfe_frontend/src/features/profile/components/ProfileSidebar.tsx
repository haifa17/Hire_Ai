"use client";

import {
  User,
  Briefcase,
  GraduationCap,
  Zap,
  Globe,
  FolderKanban,
  Award,
  CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  labelKey: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 1, labelKey: "personalInfo", icon: User },
  { id: 2, labelKey: "experience", icon: Briefcase },
  { id: 3, labelKey: "education", icon: GraduationCap },
  { id: 4, labelKey: "skills", icon: Zap },
  { id: 5, labelKey: "languages", icon: Globe },
  { id: 6, labelKey: "projects", icon: FolderKanban },
  { id: 7, labelKey: "certifications", icon: Award },
];

interface ProfileSidebarProps {
  readonly currentStep: number;
  readonly completionPercentage: number;
  readonly onStepClick: (step: number) => void;
}

export function ProfileSidebar({
  currentStep,
  completionPercentage,
  onStepClick,
}: ProfileSidebarProps) {
  const t = useTranslations("profileBuilder.sidebar");
  const currentStepLabelKey = STEPS.find((s) => s.id === currentStep)?.labelKey;

  return (
    <aside className="w-full lg:w-52 lg:shrink-0">
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          {t("eyebrow")}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {t("stepIndicator", { current: currentStep, total: STEPS.length })}{" "}
          <span className="font-medium text-blue-600">
            {currentStepLabelKey ? t(`steps.${currentStepLabelKey}`) : ""}
          </span>
        </p>
      </div>

      {/* Step Navigation: a scrollable row of steps on small screens, a list beside the form on large ones. */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:p-0">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          let stepClass = "text-gray-400 hover:bg-gray-50 cursor-pointer";
          if (isActive) stepClass = "bg-blue-50 text-blue-700";
          else if (isCompleted) stepClass = "text-gray-600 hover:bg-gray-50";

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left lg:w-full lg:gap-3",
                stepClass,
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400",
                  )}
                />
              )}
              <span>{t(`steps.${step.labelKey}`)}</span>
            </button>
          );
        })}
      </nav>

      {/* Progress */}
      <div className="mt-3 p-3 bg-gray-50 rounded-xl lg:mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("progressLabel")}
          </span>
          <span className="text-sm font-bold text-blue-600">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          {t("progressHint", { strengthRating: t("strengthRating") })}
        </p>
      </div>
    </aside>
  );
}
