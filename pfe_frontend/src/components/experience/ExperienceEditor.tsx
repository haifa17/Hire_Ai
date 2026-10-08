/**
 * ExperienceEditor Component
 * User-friendly, structured form for editing professional experience
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
  Briefcase,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  ExperienceItem,
  EMPTY_EXPERIENCE_ITEM,
  ExperienceValidationError,
} from "./types";
import {
  validateExperienceItem,
  experienceItemToString,
  stringsToExperienceItems,
} from "./utils";

interface ExperienceEditorProps {
  readonly items: string[]; // Array of formatted experience strings
  readonly onItemsChange: (items: string[]) => void;
}

export function ExperienceEditor({
  items: formattedItems,
  onItemsChange,
}: ExperienceEditorProps) {
  // Convert formatted strings to ExperienceItem objects
  const experienceItems = useMemo(
    () => stringsToExperienceItems(formattedItems),
    [formattedItems],
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<ExperienceItem>(
    EMPTY_EXPERIENCE_ITEM,
  );
  const [errors, setErrors] = useState<ExperienceValidationError[]>([]);
  const isEditing = editingIndex !== null;

  // Reset form state
  const resetForm = () => {
    setCurrentItem(EMPTY_EXPERIENCE_ITEM);
    setErrors([]);
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  // Start adding new experience
  const handleAddNew = () => {
    setCurrentItem(EMPTY_EXPERIENCE_ITEM);
    setErrors([]);
    setEditingIndex(null);
    setIsAddingNew(true);
  };

  // Start editing existing experience
  const handleEdit = (index: number) => {
    setCurrentItem({ ...experienceItems[index] });
    setEditingIndex(index);
    setIsAddingNew(false);
    setErrors([]);
  };

  // Save experience item
  const handleSave = () => {
    const validationErrors = validateExperienceItem(currentItem);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedItems = [...experienceItems];

    if (isEditing) {
      // Update existing
      updatedItems[editingIndex] = currentItem;
    } else {
      // Add new
      updatedItems.push(currentItem);
    }

    // Convert back to strings
    const formattedItems = updatedItems.map(experienceItemToString);
    onItemsChange(formattedItems);
    resetForm();
  };

  // Delete experience item
  const handleDelete = (index: number) => {
    const updatedItems = experienceItems.filter((_, i) => i !== index);
    const formattedItems = updatedItems.map(experienceItemToString);
    onItemsChange(formattedItems);
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedItems = [...experienceItems];
    [updatedItems[index - 1], updatedItems[index]] = [
      updatedItems[index],
      updatedItems[index - 1],
    ];
    const formattedItems = updatedItems.map(experienceItemToString);
    onItemsChange(formattedItems);
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === experienceItems.length - 1) return;
    const updatedItems = [...experienceItems];
    [updatedItems[index], updatedItems[index + 1]] = [
      updatedItems[index + 1],
      updatedItems[index],
    ];
    const formattedItems = updatedItems.map(experienceItemToString);
    onItemsChange(formattedItems);
  };

  // Get error for specific field
  const getFieldError = (field: keyof ExperienceItem): string | null => {
    const error = errors.find((e) => e.field === field);
    return error?.message ?? null;
  };

  const isFormVisible = isAddingNew || isEditing;
  return (
    <div className="space-y-4">
      {/* Experience List */}
      <div className="space-y-2">
        {experienceItems.length === 0 && !isFormVisible && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <Briefcase className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">
              No experience added yet. Click &quot;Add Experience&quot; to get started.
            </p>
          </div>
        )}

          {experienceItems.map((item, index) => {
          const listLocation = [item.city, item.country].filter(Boolean).join(", ") || item.location;
          const dateLabel = [item.startDate, item.endDate].filter(Boolean).join(" – ");
          const isCurrent = item.endDate === "Present";

          return (
            <div
              key={`${item.jobTitle}-${item.companyName}-${item.startDate}-${item.endDate}`}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {item.jobTitle}
                    </h4>
                    <p className="text-xs font-medium text-gray-600 truncate">{item.companyName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                      {dateLabel && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                            isCurrent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {dateLabel}
                        </span>
                      )}
                      {listLocation && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {listLocation}
                        </span>
                      )}
                    </div>
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
                  disabled={index === experienceItems.length - 1}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
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
              <p className="ml-11 mb-2 text-xs text-gray-700">{item.description}</p>
            )}

            {item.achievements.length > 0 && (
              <ul className="ml-11 space-y-1">
                {item.achievements.map((achievement) => (
                  <li key={`${item.jobTitle}-${achievement}`} className="flex gap-2 text-xs text-gray-700">
                    <span className="text-gray-400">•</span>
                    <span>{achievement}</span>
                  </li>
                ))}
              </ul>
            )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form */}
      {isFormVisible && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Briefcase className="h-4 w-4 text-indigo-600" />
            {isEditing ? "Edit Experience" : "Add New Experience"}
          </h3>

          <div className="space-y-3">
            {/* Job Title */}
            <div>
              <label htmlFor="experience-job-title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Job Title *
              </label>
              <input
                id="experience-job-title"
                type="text"
                value={currentItem.jobTitle}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, jobTitle: e.target.value })
                }
                className={getFieldError("jobTitle") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., Senior Product Manager"
              />
              {getFieldError("jobTitle") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("jobTitle")}
                </p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="experience-company-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Company Name *
              </label>
              <input
                id="experience-company-name"
                type="text"
                value={currentItem.companyName}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    companyName: e.target.value,
                  })
                }
                className={getFieldError("companyName") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., Tech Corp Inc."
              />
              {getFieldError("companyName") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("companyName")}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="experience-city" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  City
                </label>
                <input
                  id="experience-city"
                  type="text"
                  value={currentItem.city}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, city: e.target.value })
                  }
                  className="form-input"
                  placeholder="e.g., San Francisco"
                />
              </div>
              <div>
                <label htmlFor="experience-country" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Country
                </label>
                <input
                  id="experience-country"
                  type="text"
                  value={currentItem.country}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, country: e.target.value })
                  }
                  className="form-input"
                  placeholder="e.g., USA"
                />
              </div>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="experience-start-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Start Date *
                </label>
                <input
                  id="experience-start-date"
                  type="text"
                  value={currentItem.startDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      startDate: e.target.value,
                    })
                  }
                  className={getFieldError("startDate") ? "form-input form-control-error" : "form-input"}
                  placeholder="e.g., Jan 2020"
                />
                {getFieldError("startDate") && (
                  <p className="mt-1 text-xs text-red-600">
                    {getFieldError("startDate")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="experience-end-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  End Date *
                </label>
                <input
                  id="experience-end-date"
                  type="text"
                  value={currentItem.endDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      endDate: e.target.value,
                    })
                  }
                  className={getFieldError("endDate") ? "form-input form-control-error" : "form-input"}
                  placeholder="e.g., Present"
                />
                {getFieldError("endDate") && (
                  <p className="mt-1 text-xs text-red-600">
                    {getFieldError("endDate")}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="experience-description" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Description
              </label>
              <textarea
                id="experience-description"
                value={currentItem.description}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    description: e.target.value,
                  })
                }
                rows={2}
                className="form-textarea"
                placeholder="Brief summary of your role and responsibilities..."
              />
            </div>

            {/* Achievements */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                Key Achievements
              </div>
              <div className="space-y-2">
                {currentItem.achievements.map((achievement, index) => (
                  <div key={`${currentItem.jobTitle}-${achievement}`} className="flex gap-2">
                    <input
                      id={`experience-achievement-${index}`}
                      type="text"
                      value={achievement}
                      onChange={(e) => {
                        const updated = [...currentItem.achievements];
                        updated[index] = e.target.value;
                        setCurrentItem({
                          ...currentItem,
                          achievements: updated,
                        });
                      }}
                      className="form-input flex-1"
                      placeholder="e.g., Increased sales by 40%"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentItem.achievements.filter(
                          (_, i) => i !== index,
                        );
                        setCurrentItem({
                          ...currentItem,
                          achievements: updated,
                        });
                      }}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove achievement"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentItem({
                    ...currentItem,
                    achievements: [...currentItem.achievements, ""],
                  });
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Achievement
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!isFormVisible && (
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4" />
          Add Experience
        </button>
      )}
    </div>
  );
}
