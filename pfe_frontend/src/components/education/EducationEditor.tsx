/**
 * EducationEditor Component
 * User-friendly, structured form for editing education experience
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
  GraduationCap,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  EducationItem,
  EMPTY_EDUCATION_ITEM,
  EducationValidationError,
} from "./types";
import {
  validateEducationItem,
  educationItemToString,
  stringsToEducationItems,
} from "./utils";

interface EducationEditorProps {
  readonly items: string[]; // Array of formatted education strings
  readonly onItemsChange: (items: string[]) => void;
}

export function EducationEditor({
  items: formattedItems,
  onItemsChange,
}: EducationEditorProps) {
  // Convert formatted strings to EducationItem objects
  const educationItems = useMemo(
    () => stringsToEducationItems(formattedItems),
    [formattedItems],
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<EducationItem>(
    EMPTY_EDUCATION_ITEM,
  );
  const [errors, setErrors] = useState<EducationValidationError[]>([]);
  const isEditing = editingIndex !== null;

  // Reset form state
  const resetForm = () => {
    setCurrentItem(EMPTY_EDUCATION_ITEM);
    setErrors([]);
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  // Start adding new education
  const handleAddNew = () => {
    setCurrentItem(EMPTY_EDUCATION_ITEM);
    setErrors([]);
    setEditingIndex(null);
    setIsAddingNew(true);
  };

  // Start editing existing education
  const handleEdit = (index: number) => {
    setCurrentItem({ ...educationItems[index] });
    setEditingIndex(index);
    setIsAddingNew(false);
    setErrors([]);
  };

  // Save education item
  const handleSave = () => {
    const validationErrors = validateEducationItem(currentItem);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedItems = [...educationItems];

    if (isEditing) {
      // Update existing
      updatedItems[editingIndex] = currentItem;
    } else {
      // Add new
      updatedItems.push(currentItem);
    }

    // Convert back to strings
    const newFormattedItems = updatedItems.map(educationItemToString);
    onItemsChange(newFormattedItems);
    resetForm();
  };

  // Delete education item
  const handleDelete = (index: number) => {
    const updatedItems = educationItems.filter((_, i) => i !== index);
    const newFormattedItems = updatedItems.map(educationItemToString);
    onItemsChange(newFormattedItems);
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedItems = [...educationItems];
    [updatedItems[index - 1], updatedItems[index]] = [
      updatedItems[index],
      updatedItems[index - 1],
    ];
    const newFormattedItems = updatedItems.map(educationItemToString);
    onItemsChange(newFormattedItems);
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === educationItems.length - 1) return;
    const updatedItems = [...educationItems];
    [updatedItems[index], updatedItems[index + 1]] = [
      updatedItems[index + 1],
      updatedItems[index],
    ];
    const newFormattedItems = updatedItems.map(educationItemToString);
    onItemsChange(newFormattedItems);
  };

  // Get error for specific field
  const getFieldError = (field: keyof EducationItem): string | null => {
    const error = errors.find((e) => e.field === field);
    return error?.message ?? null;
  };

  const isFormVisible = isAddingNew || isEditing;

  return (
    <div className="space-y-4">
      {/* Education List */}
      <div className="space-y-2">
        {educationItems.length === 0 && !isFormVisible && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <GraduationCap className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">
              No education added yet. Click &quot;Add Education&quot; to get started.
            </p>
          </div>
        )}

        {educationItems.map((item, index) => {
          const locationLabel = [item.city, item.country].filter(Boolean).join(", ") || item.address;
          const dateLabel = [item.startDate, item.endDate].filter(Boolean).join(" – ");

          return (
          <div
            key={`${item.school}-${item.degree}-${item.startDate}-${item.endDate}`}
            className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {item.degree || "Degree"} {item.field && `in ${item.field}`}
                  </h4>
                  <p className="text-xs font-medium text-gray-600 truncate">{item.school}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    {dateLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {dateLabel}
                      </span>
                    )}
                    {locationLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {locationLabel}
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
                  disabled={index === educationItems.length - 1}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
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

      {/* Add/Edit Form */}
      {isFormVisible && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            {isEditing ? "Edit Education" : "Add New Education"}
          </h3>

          <div className="space-y-3">
            {/* School / University */}
            <div>
              <label htmlFor="education-school" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                School / University *
              </label>
              <input
                id="education-school"
                type="text"
                value={currentItem.school}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, school: e.target.value })
                }
                className={getFieldError("school") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., Harvard University"
              />
              {getFieldError("school") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("school")}
                </p>
              )}
            </div>

            {/* Degree & Field of Study */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="education-degree" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Degree
                </label>
                <input
                  id="education-degree"
                  type="text"
                  value={currentItem.degree}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      degree: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., Bachelor of Science"
                />
              </div>
              <div>
                <label htmlFor="education-field" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Field of Study
                </label>
                <input
                  id="education-field"
                  type="text"
                  value={currentItem.field}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      field: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            {/* City / Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="education-city" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  City
                </label>
                <input
                  id="education-city"
                  type="text"
                  value={currentItem.city}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, city: e.target.value })
                  }
                  className="form-input"
                  placeholder="e.g., Cambridge"
                />
              </div>
              <div>
                <label htmlFor="education-country" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Country
                </label>
                <input
                  id="education-country"
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
                <label htmlFor="education-start-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Start Year
                </label>
                <input
                  id="education-start-date"
                  type="text"
                  value={currentItem.startDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      startDate: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., 2018"
                />
              </div>

              <div>
                <label htmlFor="education-end-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  End Year
                </label>
                <input
                  id="education-end-date"
                  type="text"
                  value={currentItem.endDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      endDate: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., 2022"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="education-description" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                Description
              </label>
              <textarea
                id="education-description"
                value={currentItem.description}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="form-textarea"
                placeholder="Relevant coursework, honors, GPA..."
              />
            </div>
          </div>

          {/* Form Actions */}
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

      {/* Add Button */}
      {!isFormVisible && (
        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          Add Education
        </button>
      )}
    </div>
  );
}
