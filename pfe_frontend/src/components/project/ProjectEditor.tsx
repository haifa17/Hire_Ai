/**
 * ProjectEditor Component
 * User-friendly, structured form for editing projects experience
 */

"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  FolderKanban,
  Link2,
} from "lucide-react";
import {
  ProjectItem,
  EMPTY_PROJECT_ITEM,
  ProjectValidationError,
} from "./types";
import {
  validateProjectItem,
  projectItemToString,
  stringsToProjectItems,
} from "./utils";

interface ProjectEditorProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
}

export function ProjectEditor({
  items: formattedItems,
  onItemsChange,
}: ProjectEditorProps) {
  const projectItems = useMemo(
    () => stringsToProjectItems(formattedItems),
    [formattedItems],
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<ProjectItem>(
    EMPTY_PROJECT_ITEM,
  );
  const [errors, setErrors] = useState<ProjectValidationError[]>([]);

  const resetForm = () => {
    setCurrentItem(EMPTY_PROJECT_ITEM);
    setErrors([]);
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleAddNew = () => {
    setCurrentItem(EMPTY_PROJECT_ITEM);
    setErrors([]);
    setEditingIndex(null);
    setIsAddingNew(true);
  };

  const handleEdit = (index: number) => {
    setCurrentItem({ ...projectItems[index] });
    setEditingIndex(index);
    setIsAddingNew(false);
    setErrors([]);
  };

  const handleSave = () => {
    const validationErrors = validateProjectItem(currentItem);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedItems = [...projectItems];

    if (editingIndex !== null) {
      updatedItems[editingIndex] = currentItem;
    } else {
      updatedItems.push(currentItem);
    }

    const newFormattedItems = updatedItems.map(projectItemToString);
    onItemsChange(newFormattedItems);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const updatedItems = projectItems.filter((_, i) => i !== index);
    const newFormattedItems = updatedItems.map(projectItemToString);
    onItemsChange(newFormattedItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedItems = [...projectItems];
    [updatedItems[index - 1], updatedItems[index]] = [
      updatedItems[index],
      updatedItems[index - 1],
    ];
    const newFormattedItems = updatedItems.map(projectItemToString);
    onItemsChange(newFormattedItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === projectItems.length - 1) return;
    const updatedItems = [...projectItems];
    [updatedItems[index], updatedItems[index + 1]] = [
      updatedItems[index + 1],
      updatedItems[index],
    ];
    const newFormattedItems = updatedItems.map(projectItemToString);
    onItemsChange(newFormattedItems);
  };

  const getFieldError = (field: keyof ProjectItem): string | null => {
    const error = errors.find((e) => e.field === field);
    return error?.message ?? null;
  };

  const isFormVisible = isAddingNew || editingIndex !== null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {projectItems.length === 0 && !isFormVisible && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <FolderKanban className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">
              No project added yet. Click &quot;Add Project&quot; to get started.
            </p>
          </div>
        )}

        {projectItems.map((item, index) => {
          return (
          <div
            key={`${item.title}-${index}`}
            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {item.title || "Project Title"}
                  </h4>
                  {item.url && (
                    <a
                      href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline"
                    >
                      <Link2 className="h-3 w-3 shrink-0" />
                      Link
                    </a>
                  )}
                  {item.keywords && (
                    <p className="mt-1 text-xs text-gray-500">Keywords: {item.keywords}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0 opacity-60 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === projectItems.length - 1}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="rounded p-1 text-gray-400 hover:bg-violet-50 hover:text-violet-600"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {item.description && (
              <p className="ml-11 mt-1 text-xs text-gray-700 whitespace-pre-wrap">{item.description}</p>
            )}
          </div>
          );
        })}
      </div>

      {isFormVisible && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FolderKanban className="h-4 w-4 text-violet-600" />
            {editingIndex !== null ? "Edit Project" : "Add New Project"}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Project Title *
              </label>
              <input
                type="text"
                value={currentItem.title}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, title: e.target.value })
                }
                className={getFieldError("title") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., E-commerce Platform"
              />
              {getFieldError("title") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("title")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Project URL (optional)
                </label>
                <input
                  type="text"
                  value={currentItem.url}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      url: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., https://github.com/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Keywords (optional)
                </label>
                <input
                  type="text"
                  value={currentItem.keywords}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      keywords: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., React, Node.js, AWS"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Description
              </label>
              <textarea
                value={currentItem.description}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    description: e.target.value,
                  })
                }
                rows={4}
                className="form-textarea"
                placeholder="What did you build? What were the challenges?"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isFormVisible && (
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:border-violet-300 hover:bg-violet-50"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      )}
    </div>
  );
}
