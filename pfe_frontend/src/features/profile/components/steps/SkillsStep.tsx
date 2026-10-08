"use client";

import { useState, KeyboardEvent, useEffect, useMemo, useRef } from "react";
import { X, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProfileStore } from "@/store/useProfileStore";
import { SkillLevel } from "@/domain/models/Profile";
import { aiEnhanceService } from "@/services/aiEnhanceService";

const LEVEL_OPTIONS: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const LEVEL_COLORS: Record<SkillLevel, string> = {
  Beginner: "bg-gray-100 text-gray-600",
  Intermediate: "bg-blue-50 text-blue-700",
  Advanced: "bg-indigo-50 text-indigo-700",
  Expert: "bg-purple-50 text-purple-700",
};

const SUGGESTED_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "SQL",
  "Git",
  "Docker",
  "AWS",
  "UI/UX Design",
  "Agile",
  "Communication",
];

export function SkillsStep() {
  const t = useTranslations("profileBuilder.steps.skills");
  const { profile, addSkill, removeSkill } = useProfileStore();
  const [input, setInput] = useState("");
  const [selectedLevel, setSelectedLevel] =
    useState<SkillLevel>("Intermediate");
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string[]>(
    [],
  );
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const suggestionsGeneratedForRef = useRef<string>("");

  const existingNames = useMemo(
    () => new Set(profile.skills.map((s) => s.name.toLowerCase())),
    [profile.skills],
  );

  async function handleGenerateSuggestions() {
    setSkillsError(null);
    setIsGeneratingSuggestions(true);

    try {
      const skills = await aiEnhanceService.suggestSkills({
        context: {
          personalSummary: profile.personalInfo.summary,
          desiredPosition: profile.personalInfo.desiredPosition,
          experiences: profile.experiences.map((experience) => ({
            jobTitle: experience.jobTitle,
            companyName: experience.companyName,
            description: experience.description,
          })),
          education: profile.educations.map((education) => ({
            degree: education.degree,
            fieldOfStudy: education.fieldOfStudy,
          })),
          projects: profile.projects.map((project) => ({
            title: project.title,
            description: project.description,
          })),
          existingSkills: profile.skills.map((skill) => skill.name),
        },
      });

      const filteredSkills = skills.filter(
        (skill) => !existingNames.has(skill.toLowerCase()),
      );
      setGeneratedSuggestions(filteredSkills);
      suggestionsGeneratedForRef.current = profile.personalInfo.desiredPosition;
    } catch (error) {
      setSkillsError(
        error instanceof Error
          ? error.message
          : t("generateFailed"),
      );
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }

  function handleAddSkill(name: string) {
    const trimmed = name.trim();
    if (!trimmed || existingNames.has(trimmed.toLowerCase())) return;
    addSkill({ name: trimmed, level: selectedLevel });
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill(input);
    }
  }

  // Auto-generate suggestions when desiredPosition changes
  useEffect(() => {
    const desiredPosition = profile.personalInfo.desiredPosition?.trim();
    if (
      desiredPosition &&
      desiredPosition !== suggestionsGeneratedForRef.current
    ) {
      (async () => {
        setSkillsError(null);
        setIsGeneratingSuggestions(true);

        try {
          const skills = await aiEnhanceService.suggestSkills({
            context: {
              personalSummary: profile.personalInfo.summary,
              desiredPosition: profile.personalInfo.desiredPosition,
              experiences: profile.experiences.map((experience) => ({
                jobTitle: experience.jobTitle,
                companyName: experience.companyName,
                description: experience.description,
              })),
              education: profile.educations.map((education) => ({
                degree: education.degree,
                fieldOfStudy: education.fieldOfStudy,
              })),
              projects: profile.projects.map((project) => ({
                title: project.title,
                description: project.description,
              })),
              existingSkills: profile.skills.map((skill) => skill.name),
            },
          });

          const filteredSkills = skills.filter(
            (skill) => !existingNames.has(skill.toLowerCase()),
          );
          setGeneratedSuggestions(filteredSkills);
          suggestionsGeneratedForRef.current = desiredPosition;
        } catch (error) {
          setSkillsError(
            error instanceof Error
              ? error.message
              : t("generateFailed"),
          );
        } finally {
          setIsGeneratingSuggestions(false);
        }
      })();
    }
    // desiredPosition-only trigger is intentional: suggestionsGeneratedForRef
    // guards against re-running for the same position even though the other
    // profile fields are included below purely to satisfy exhaustive-deps.
  }, [
    profile.personalInfo.desiredPosition,
    profile.personalInfo.summary,
    profile.experiences,
    profile.educations,
    profile.projects,
    profile.skills,
    existingNames,
  ]);

  const suggestions = Array.from(
    new Set([...generatedSuggestions, ...SUGGESTED_SKILLS]),
  ).filter((s) => !existingNames.has(s.toLowerCase()));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 mb-5">{t("subtitle")}</p>

      {/* Input Row */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            className="form-input"
          />
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value as SkillLevel)}
          className="form-select w-auto"
          aria-label={t("skillLevelLabel")}
        >
          {LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {t(`levels.${level}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => handleAddSkill(input)}
          disabled={!input.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={t("addSkill")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Skill Tags */}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {profile.skills.map((skill) => (
            <div
              key={skill.id}
              className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium ${LEVEL_COLORS[skill.level]}`}
            >
              <span>{skill.name}</span>
              <span className="text-xs opacity-60">
                · {t(`levels.${skill.level}`)}
              </span>
              <button
                onClick={() => removeSkill(skill.id)}
                className="ml-0.5 hover:opacity-80 transition-opacity"
                aria-label={t("removeSkill", { name: skill.name })}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {t("suggestedSkills")}
          </p>
          <button
            type="button"
            onClick={handleGenerateSuggestions}
            disabled={isGeneratingSuggestions}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGeneratingSuggestions ? t("generating") : t("aiSuggestions")}
          </button>
        </div>
        {skillsError && (
          <p className="text-xs text-red-600 mb-2">{skillsError}</p>
        )}
        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleAddSkill(skill)}
                className="inline-flex items-center gap-1 text-sm text-gray-600 border border-gray-200 bg-white hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors"
              >
                <Plus className="w-3 h-3" />
                {skill}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">{t("noSuggestions")}</p>
        )}
      </div>
    </div>
  );
}
