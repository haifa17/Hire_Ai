"use client";

import { useState } from "react";
import {
  GraduationCap,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/store/useProfileStore";
import { CandidateProfile, Education } from "@/domain/models/Profile";
import { aiEnhanceService } from "@/services/aiEnhanceService";

const emptyForm: Omit<Education, "id"> = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  city: "",
  country: "",
  startYear: "",
  endYear: null,
  isCurrent: false,
  description: "",
};

interface EducationCardProps {
  readonly education: Education;
  readonly onEdit: (edu: Education) => void;
  readonly onDelete: (id: string) => void;
}

function EducationCard({ education, onEdit, onDelete }: EducationCardProps) {
  const t = useTranslations("profileBuilder.steps.education");
  return (
    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <GraduationCap className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {education.degree}
              {education.fieldOfStudy &&
                ` ${t("inField", { field: education.fieldOfStudy })}`}
            </h4>
            <p className="text-sm text-blue-600 font-medium">
              {education.institution}
            </p>
            {(education.city || education.country) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[education.city, education.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(education)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label={t("editButton")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(education.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label={t("deleteButton")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {education.startYear && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {education.startYear} –{" "}
            {education.isCurrent ? t("present") : (education.endYear ?? "")}
          </p>
        )}
        {education.description && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
            {education.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface EducationFormProps {
  readonly initialData?: Education;
  readonly onSave: (data: Omit<Education, "id">) => void;
  readonly onCancel: () => void;
  readonly profileContext: CandidateProfile;
}

function EducationForm({
  initialData,
  onSave,
  onCancel,
  profileContext,
}: EducationFormProps) {
  const t = useTranslations("profileBuilder.steps.education");
  const [form, setForm] = useState<Omit<Education, "id">>(
    initialData
      ? {
          institution: initialData.institution,
          degree: initialData.degree,
          fieldOfStudy: initialData.fieldOfStudy,
          city: initialData.city ?? "",
          country: initialData.country ?? "",
          startYear: initialData.startYear,
          endYear: initialData.endYear,
          isCurrent: initialData.isCurrent,
          description: initialData.description,
        }
      : emptyForm,
  );
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEnhanceDescription() {
    setDescriptionError(null);
    setIsEnhancingDescription(true);

    try {
      const enhancedDescription = await aiEnhanceService.enhanceText({
        target: "education_description",
        text: form.description,
        context: {
          institution: form.institution,
          degree: form.degree,
          fieldOfStudy: form.fieldOfStudy,
          city: form.city,
          country: form.country,
          startYear: form.startYear,
          endYear: form.endYear,
          personalSummary: profileContext.personalInfo.summary,
          desiredPosition: profileContext.personalInfo.desiredPosition,
          skills: profileContext.skills.map((skill) => skill.name),
        },
      });

      update("description", enhancedDescription);
    } catch (error) {
      setDescriptionError(
        error instanceof Error ? error.message : t("enhanceFailed"),
      );
    } finally {
      setIsEnhancingDescription(false);
    }
  }

  const inputClass = "form-input";

  const canSave =
    form.institution.trim().length > 0 &&
    form.degree.trim().length > 0 &&
    form.fieldOfStudy.trim().length > 0 &&
    form.startYear.trim().length > 0 &&
    (form.isCurrent || (form.endYear ?? "").trim().length > 0);

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50">
      <h3 className="text-sm font-semibold text-gray-800">
        {initialData ? t("editTitle") : t("addTitle")}
      </h3>
      <p className="text-xs text-gray-500">{t("requiredFieldsHint")}</p>

      <div>
        <label
          htmlFor="institution"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {t("fields.institution")} <span className="text-red-500">*</span>
        </label>
        <input
          id="institution"
          type="text"
          placeholder={t("fields.institutionPlaceholder")}
          value={form.institution}
          onChange={(e) => update("institution", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="degree"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.degree")} <span className="text-red-500">*</span>
          </label>
          <input
            id="degree"
            type="text"
            placeholder={t("fields.degreePlaceholder")}
            value={form.degree}
            onChange={(e) => update("degree", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="fieldOfStudy"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.fieldOfStudy")} <span className="text-red-500">*</span>
          </label>
          <input
            id="fieldOfStudy"
            type="text"
            placeholder={t("fields.fieldOfStudyPlaceholder")}
            value={form.fieldOfStudy}
            onChange={(e) => update("fieldOfStudy", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="eduCity"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.city")}
          </label>
          <input
            id="eduCity"
            type="text"
            placeholder={t("fields.cityPlaceholder")}
            value={form.city ?? ""}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="eduCountry"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.country")}
          </label>
          <input
            id="eduCountry"
            type="text"
            placeholder={t("fields.countryPlaceholder")}
            value={form.country ?? ""}
            onChange={(e) => update("country", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startYear"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.startYear")} <span className="text-red-500">*</span>
          </label>
          <input
            id="startYear"
            type="number"
            min={1950}
            max={2099}
            placeholder="2018"
            value={form.startYear}
            onChange={(e) => update("startYear", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="endYear"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.endYear")}{" "}
            {!form.isCurrent && <span className="text-red-500">*</span>}
          </label>
          <input
            id="endYear"
            type="number"
            min={1950}
            max={2099}
            placeholder="2022"
            disabled={form.isCurrent}
            value={form.endYear ?? ""}
            onChange={(e) => update("endYear", e.target.value || null)}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => {
            update("isCurrent", e.target.checked);
            if (e.target.checked) update("endYear", null);
          }}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />{" "}
        {t("currentlyStudyingHere")}
      </label>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="eduDescription"
            className="block text-sm font-medium text-gray-700"
          >
            {t("description")}
          </label>
          <button
            type="button"
            onClick={handleEnhanceDescription}
            disabled={isEnhancingDescription}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isEnhancingDescription ? t("enhancing") : t("aiEnhance")}
          </button>
        </div>
        <textarea
          id="eduDescription"
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="form-textarea resize-none"
        />
        {descriptionError && (
          <p className="text-xs text-red-600 mt-1">{descriptionError}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!canSave}>
          {t("saveEntry")}
        </Button>
      </div>
    </div>
  );
}

export function EducationStep() {
  const t = useTranslations("profileBuilder.steps.education");
  const { profile, addEducation, updateEducation, removeEducation } =
    useProfileStore();
  const [showForm, setShowForm] = useState(profile.educations.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSaveNew(data: Omit<Education, "id">) {
    addEducation(data);
    setShowForm(false);
  }

  function handleSaveEdit(data: Omit<Education, "id">) {
    if (!editingId) return;
    updateEducation(editingId, data);
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        {!showForm && !editingId && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("addEducation")}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">{t("subtitle")}</p>

      <div className="space-y-3">
        {profile.educations.map((edu) =>
          editingId === edu.id ? (
            <EducationForm
              key={edu.id}
              initialData={edu}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
              profileContext={profile}
            />
          ) : (
            <EducationCard
              key={edu.id}
              education={edu}
              onEdit={(e) => {
                setEditingId(e.id);
                setShowForm(false);
              }}
              onDelete={removeEducation}
            />
          ),
        )}

        {showForm && (
          <EducationForm
            onSave={handleSaveNew}
            onCancel={() => setShowForm(false)}
            profileContext={profile}
          />
        )}

        {!showForm && !editingId && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("addAnotherEducation")}
          </button>
        )}
      </div>
    </div>
  );
}
