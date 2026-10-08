"use client";

import { useState } from "react";
import {
  Briefcase,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/store/useProfileStore";
import { CandidateProfile, Experience } from "@/domain/models/Profile";
import { aiEnhanceService } from "@/services/aiEnhanceService";

const emptyForm: Omit<Experience, "id"> = {
  jobTitle: "",
  companyName: "",
  location: "",
  city: "",
  country: "",
  startDate: "",
  endDate: null,
  isCurrent: false,
  description: "",
};

function formatDateRange(
  startDate: string,
  endDate: string | null,
  isCurrent: boolean,
  locale: string,
  presentLabel: string,
): string {
  if (!startDate) return "";
  const formatDate = (d: string) => {
    const [year, month] = d.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(date);
  };
  const start = formatDate(startDate);
  let endStr = "";
  if (isCurrent) {
    endStr = presentLabel;
  } else if (endDate) {
    endStr = formatDate(endDate);
  }
  return `${start} – ${endStr}`;
}

function getDuration(
  startDate: string,
  endDate: string | null,
  isCurrent: boolean,
  formatYears: (count: number) => string,
  formatMonths: (count: number) => string,
): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = isCurrent || !endDate ? new Date() : new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(formatYears(years));
  if (remainingMonths > 0) parts.push(formatMonths(remainingMonths));
  return parts.join(" ");
}

interface ExperienceCardProps {
  readonly experience: Experience;
  readonly onEdit: (experience: Experience) => void;
  readonly onDelete: (id: string) => void;
}

function ExperienceCard({ experience, onEdit, onDelete }: ExperienceCardProps) {
  const t = useTranslations("profileBuilder.steps.experience");
  const locale = useLocale();
  const dateRange = formatDateRange(
    experience.startDate,
    experience.endDate,
    experience.isCurrent,
    locale,
    t("present"),
  );
  const duration = getDuration(
    experience.startDate,
    experience.endDate,
    experience.isCurrent,
    (count) => t("years", { count }),
    (count) => t("months", { count }),
  );

  return (
    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <Briefcase className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {experience.jobTitle}
            </h4>
            <p className="text-sm text-blue-600 font-medium">
              {experience.companyName}
              {(experience.city || experience.country || experience.location) && (
                <span className="text-gray-500 font-normal">
                  {" "}
                  • {[experience.city, experience.country].filter(Boolean).join(", ") || experience.location}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(experience)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label={t("editButton")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(experience.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label={t("deleteButton")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {dateRange} {duration && `(${duration})`}
          </p>
        )}
        {experience.description && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
            {experience.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface ExperienceFormProps {
  readonly initialData?: Experience;
  readonly onSave: (data: Omit<Experience, "id">) => void;
  readonly onCancel: () => void;
  readonly profileContext: CandidateProfile;
}

function ExperienceForm({
  initialData,
  onSave,
  onCancel,
  profileContext,
}: ExperienceFormProps) {
  const t = useTranslations("profileBuilder.steps.experience");
  const [form, setForm] = useState<Omit<Experience, "id">>(
    initialData
      ? {
          jobTitle: initialData.jobTitle,
          companyName: initialData.companyName,
          location: initialData.location,
          city: initialData.city ?? "",
          country: initialData.country ?? "",
          startDate: initialData.startDate,
          endDate: initialData.endDate,
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

  function handleSubmit() {
    if (
      !form.jobTitle.trim() ||
      !form.companyName.trim() ||
      !form.startDate ||
      (!form.isCurrent && !form.endDate)
    ) {
      return;
    }
    onSave(form);
  }

  async function handleEnhanceDescription() {
    setDescriptionError(null);
    setIsEnhancingDescription(true);

    try {
      const enhancedDescription = await aiEnhanceService.enhanceText({
        target: "experience_description",
        text: form.description,
        context: {
          jobTitle: form.jobTitle,
          companyName: form.companyName,
          location: form.location,
          city: form.city,
          country: form.country,
          personalSummary: profileContext.personalInfo.summary,
          desiredPosition: profileContext.personalInfo.desiredPosition,
          candidateSkills: profileContext.skills.map((skill) => skill.name),
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

  const canSave =
    form.jobTitle.trim().length > 0 &&
    form.companyName.trim().length > 0 &&
    form.startDate.length > 0 &&
    (form.isCurrent || (form.endDate ?? "").length > 0);

  const inputClass = "form-input";

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50">
      <h3 className="text-sm font-semibold text-gray-800">
        {initialData ? t("editTitle") : t("addTitle")}
      </h3>
      <p className="text-xs text-gray-500">{t("requiredFieldsHint")}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="jobTitle"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.jobTitle")} <span className="text-red-500">*</span>
          </label>
          <input
            id="jobTitle"
            type="text"
            placeholder={t("fields.jobTitlePlaceholder")}
            value={form.jobTitle}
            onChange={(e) => update("jobTitle", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.companyName")} <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            placeholder={t("fields.companyNamePlaceholder")}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="expCity"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.city")}
          </label>
          <input
            id="expCity"
            type="text"
            placeholder={t("fields.cityPlaceholder")}
            value={form.city ?? ""}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="expCountry"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.country")}
          </label>
          <input
            id="expCountry"
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
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.startDate")} <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            type="month"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.endDate")}{" "}
            {!form.isCurrent && <span className="text-red-500">*</span>}
          </label>
          <input
            id="endDate"
            type="month"
            value={form.endDate ?? ""}
            disabled={form.isCurrent}
            onChange={(e) => update("endDate", e.target.value || null)}
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
            if (e.target.checked) update("endDate", null);
          }}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />{" "}
        {t("currentlyWorkHere")}
      </label>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="expDescription"
            className="text-sm font-medium text-gray-700"
          >
            {t("description")}
          </label>
          <button
            type="button"
            onClick={handleEnhanceDescription}
            disabled={isEnhancingDescription}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isEnhancingDescription ? t("enhancing") : t("aiEnhanceDescription")}
          </button>
        </div>
        <textarea
          id="expDescription"
          rows={4}
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
        <Button size="sm" onClick={handleSubmit} disabled={!canSave}>
          {t("saveEntry")}
        </Button>
      </div>
    </div>
  );
}

export function ExperienceStep() {
  const t = useTranslations("profileBuilder.steps.experience");
  const { profile, addExperience, updateExperience, removeExperience } =
    useProfileStore();
  const [showForm, setShowForm] = useState(profile.experiences.length === 0);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(
    null,
  );

  function handleSaveNew(data: Omit<Experience, "id">) {
    addExperience(data);
    setShowForm(false);
  }

  function handleSaveEdit(data: Omit<Experience, "id">) {
    if (!editingExperience) return;
    updateExperience(editingExperience.id, data);
    setEditingExperience(null);
  }

  function handleEdit(experience: Experience) {
    setEditingExperience(experience);
    setShowForm(false);
  }

  function handleCancelEdit() {
    setEditingExperience(null);
  }

  function handleCancelNew() {
    setShowForm(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        {!showForm && !editingExperience && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("addRole")}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">{t("subtitle")}</p>

      <div className="space-y-3">
        {profile.experiences.map((exp) =>
          editingExperience?.id === exp.id ? (
            <ExperienceForm
              key={exp.id}
              initialData={exp}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              profileContext={profile}
            />
          ) : (
            <ExperienceCard
              key={exp.id}
              experience={exp}
              onEdit={handleEdit}
              onDelete={removeExperience}
            />
          ),
        )}

        {showForm && (
          <ExperienceForm
            onSave={handleSaveNew}
            onCancel={handleCancelNew}
            profileContext={profile}
          />
        )}

        {!showForm && !editingExperience && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("addAnotherRole")}
          </button>
        )}
      </div>
    </div>
  );
}
