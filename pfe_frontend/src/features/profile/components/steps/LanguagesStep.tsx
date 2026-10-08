"use client";

import { useState } from "react";
import { Globe, Trash2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProfileStore } from "@/store/useProfileStore";
import { LanguageProficiency } from "@/domain/models/Profile";

const PROFICIENCY_OPTIONS: LanguageProficiency[] = [
  "Native",
  "Fluent",
  "Advanced",
  "Intermediate",
  "Basic",
];

const PROFICIENCY_COLORS: Record<LanguageProficiency, string> = {
  Native: "bg-green-100 text-green-700",
  Fluent: "bg-blue-100 text-blue-700",
  Advanced: "bg-indigo-100 text-indigo-700",
  Intermediate: "bg-yellow-100 text-yellow-700",
  Basic: "bg-gray-100 text-gray-600",
};

const SUGGESTED_LANGUAGE_KEYS = [
  "English",
  "French",
  "Arabic",
  "Spanish",
  "German",
  "Portuguese",
  "Chinese",
  "Hindi",
  "Russian",
  "Italian",
];

export function LanguagesStep() {
  const t = useTranslations("profileBuilder.steps.languages");
  const { profile, addLanguage, updateLanguage, removeLanguage } =
    useProfileStore();
  const [langName, setLangName] = useState("");
  const [proficiency, setProficiency] = useState<LanguageProficiency>("Fluent");

  const suggestedLanguages = SUGGESTED_LANGUAGE_KEYS.map((key) =>
    t(`suggested.${key}`),
  );

  function handleAdd() {
    const trimmed = langName.trim();
    if (!trimmed) return;
    const alreadyExists = profile.languages.some(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) return;
    addLanguage({ name: trimmed, proficiency });
    setLangName("");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("title")}</h2>
      <p className="text-sm text-gray-500 mb-5">{t("subtitle")}</p>
      <p className="text-xs text-gray-500 mb-3">{t("requiredFieldsHint")}</p>

      {/* Add Language Row */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <label
            htmlFor="langName"
            className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5"
          >
            {t("language")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="langName"
              type="text"
              list="languages-list"
              placeholder={t("languagePlaceholder")}
              value={langName}
              onChange={(e) => setLangName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="form-input pl-9"
            />
            <datalist id="languages-list">
              {suggestedLanguages.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="w-52">
          <label
            htmlFor="langProficiency"
            className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5"
          >
            {t("proficiency")}
          </label>
          <select
            id="langProficiency"
            value={proficiency}
            onChange={(e) =>
              setProficiency(e.target.value as LanguageProficiency)
            }
            className="form-select"
          >
            {PROFICIENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`proficiencyOptions.${opt}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!langName.trim()}
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label={t("addLanguage")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Language List */}
      {profile.languages.length > 0 ? (
        <div className="space-y-2">
          {profile.languages.map((lang) => (
            <div
              key={lang.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-gray-800">
                  {lang.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={lang.proficiency}
                  onChange={(e) =>
                    updateLanguage(lang.id, {
                      proficiency: e.target.value as LanguageProficiency,
                    })
                  }
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer ${PROFICIENCY_COLORS[lang.proficiency]}`}
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`proficiencyOptions.${opt}`)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeLanguage(lang.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={t("removeLanguage", { name: lang.name })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Globe className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t("emptyState")}</p>
        </div>
      )}
    </div>
  );
}
