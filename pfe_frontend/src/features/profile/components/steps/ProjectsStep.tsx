"use client";

import { useState } from "react";
import {
  FolderKanban,
  Link,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/store/useProfileStore";
import { CandidateProfile, Project } from "@/domain/models/Profile";
import { aiEnhanceService } from "@/services/aiEnhanceService";

const emptyForm: Omit<Project, "id"> = {
  title: "",
  description: "",
  url: "",
};

interface ProjectCardProps {
  readonly project: Project;
  readonly onEdit: (project: Project) => void;
  readonly onDelete: (id: string) => void;
}

function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const t = useTranslations("profileBuilder.steps.projects");
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
        <FolderKanban className="h-5 w-5 text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-gray-900">
              {project.title}
            </h4>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Link className="h-3.5 w-3.5" />
                {t("viewProject")}
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onEdit(project)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              aria-label={t("editButton")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label={t("deleteButton")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {project.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
            {project.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface ProjectFormProps {
  readonly initialData?: Project;
  readonly onSave: (data: Omit<Project, "id">) => void;
  readonly onCancel: () => void;
  readonly profileContext: CandidateProfile;
}

function ProjectForm({
  initialData,
  onSave,
  onCancel,
  profileContext,
}: ProjectFormProps) {
  const t = useTranslations("profileBuilder.steps.projects");
  const [form, setForm] = useState<Omit<Project, "id">>(
    initialData
      ? {
          title: initialData.title,
          description: initialData.description,
          url: initialData.url,
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
        target: "project_description",
        text: form.description,
        context: {
          title: form.title,
          url: form.url,
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

  const inputClass = "form-input";

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
      <h3 className="text-sm font-semibold text-gray-800">
        {initialData ? t("editTitle") : t("addTitle")}
      </h3>
      <p className="text-xs text-gray-500">{t("requiredFieldsHint")}</p>

      <div>
        <label
          htmlFor="projectTitle"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("fields.title")} <span className="text-red-500">*</span>
        </label>
        <input
          id="projectTitle"
          type="text"
          className={inputClass}
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("fields.titlePlaceholder")}
        />
      </div>

      <div>
        <label
          htmlFor="projectUrl"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {t("fields.url")}
        </label>
        <div className="relative">
          <Link className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="projectUrl"
            type="url"
            className="form-input pl-9"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder={t("fields.urlPlaceholder")}
            aria-describedby="projectUrl-hint"
          />
        </div>
        <p id="projectUrl-hint" className="mt-1.5 text-xs text-gray-500">
          {t("fields.urlHint")}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="projectDescription"
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
          id="projectDescription"
          rows={4}
          className="form-textarea resize-none"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
        {descriptionError && (
          <p className="text-xs text-red-600 mt-1">{descriptionError}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(form)}
          disabled={!form.title.trim()}
        >
          {t("saveProject")}
        </Button>
      </div>
    </div>
  );
}

export function ProjectsStep() {
  const t = useTranslations("profileBuilder.steps.projects");
  const { profile, addProject, updateProject, removeProject } =
    useProfileStore();
  const [showForm, setShowForm] = useState(profile.projects.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSaveNew(data: Omit<Project, "id">) {
    addProject(data);
    setShowForm(false);
  }

  function handleSaveEdit(data: Omit<Project, "id">) {
    if (!editingId) return;
    updateProject(editingId, data);
    setEditingId(null);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        {!showForm && !editingId && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("addProject")}
          </Button>
        )}
      </div>
      <p className="mb-5 text-sm text-gray-500">{t("subtitle")}</p>

      {showForm && (
        <ProjectForm
          profileContext={profile}
          onSave={handleSaveNew}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingId && (
        <ProjectForm
          profileContext={profile}
          initialData={profile.projects.find(
            (project) => project.id === editingId,
          )}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      {!showForm && !editingId && (
        <div className="space-y-3">
          {profile.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
              <FolderKanban className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">{t("emptyState")}</p>
            </div>
          ) : (
            profile.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(selected) => setEditingId(selected.id)}
                onDelete={removeProject}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
