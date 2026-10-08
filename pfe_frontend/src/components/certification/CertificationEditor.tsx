/**
 * CertificationEditor Component
 * User-friendly, structured form for editing certifications
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
} from "lucide-react";
import {
  CertificationItem,
  EMPTY_CERTIFICATION_ITEM,
  CertificationValidationError,
} from "./types";
import {
  validateCertificationItem,
  certificationItemToString,
  stringsToCertificationItems,
} from "./utils";
import api from "@/lib/api";

interface CertificationEditorProps {
  readonly items: string[];
  readonly onItemsChange: (items: string[]) => void;
}

export function CertificationEditor({
  items: formattedItems,
  onItemsChange,
}: CertificationEditorProps) {
  const certificationItems = useMemo(
    () => stringsToCertificationItems(formattedItems),
    [formattedItems],
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<CertificationItem>(
    EMPTY_CERTIFICATION_ITEM,
  );
  const [errors, setErrors] = useState<CertificationValidationError[]>([]);
  const isEditing = editingIndex !== null;

  const resetForm = () => {
    setCurrentItem(EMPTY_CERTIFICATION_ITEM);
    setErrors([]);
    setIsAddingNew(false);
    setEditingIndex(null);
  };

  const handleAddNew = () => {
    setCurrentItem(EMPTY_CERTIFICATION_ITEM);
    setErrors([]);
    setEditingIndex(null);
    setIsAddingNew(true);
  };

  const handleEdit = (index: number) => {
    setCurrentItem({ ...certificationItems[index] });
    setEditingIndex(index);
    setIsAddingNew(false);
    setErrors([]);
  };

  const handleSave = () => {
    const validationErrors = validateCertificationItem(currentItem);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const updatedItems = [...certificationItems];

    if (isEditing) {
      updatedItems[editingIndex] = currentItem;
    } else {
      updatedItems.push(currentItem);
    }

    const newFormattedItems = updatedItems.map(certificationItemToString);
    onItemsChange(newFormattedItems);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const updatedItems = certificationItems.filter((_, i) => i !== index);
    const newFormattedItems = updatedItems.map(certificationItemToString);
    onItemsChange(newFormattedItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedItems = [...certificationItems];
    [updatedItems[index - 1], updatedItems[index]] = [
      updatedItems[index],
      updatedItems[index - 1],
    ];
    const newFormattedItems = updatedItems.map(certificationItemToString);
    onItemsChange(newFormattedItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === certificationItems.length - 1) return;
    const updatedItems = [...certificationItems];
    [updatedItems[index], updatedItems[index + 1]] = [
      updatedItems[index + 1],
      updatedItems[index],
    ];
    const newFormattedItems = updatedItems.map(certificationItemToString);
    onItemsChange(newFormattedItems);
  };

  const getFieldError = (field: keyof CertificationItem): string | null => {
    const error = errors.find((e) => e.field === field);
    return error?.message ?? null;
  };

  const isFormVisible = isAddingNew || isEditing;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {certificationItems.length === 0 && !isFormVisible && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm text-gray-500">
              No certifications added yet. Click &quot;Add Certification&quot; to get
              started.
            </p>
          </div>
        )}

        {certificationItems.map((item, index) => (
          <div
            key={`${item.name}-${item.issuer}-${item.issueDate}-${item.expiryDate}`}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {item.name || "Certification Name"}
                </h4>
                <p className="text-xs text-gray-600">{item.issuer}</p>
                <div className="mt-1 flex gap-2 flex-wrap text-xs text-gray-500">
                  {(item.issueDate || item.expiryDate) && (
                    <span>
                      {item.issueDate}{" "}
                      {item.expiryDate ? `to ${item.expiryDate}` : ""}
                    </span>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Credential Link
                    </a>
                  )}
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      View File
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === certificationItems.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isFormVisible && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            {isEditing ? "Edit Certification" : "Add New Certification"}
          </h3>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="certification-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
              >
                Certification Name *
              </label>
              <input
                id="certification-name"
                type="text"
                value={currentItem.name}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, name: e.target.value })
                }
                className={getFieldError("name") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., AWS Certified Solutions Architect"
              />
              {getFieldError("name") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("name")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="certification-issuer"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
              >
                Issuing Organization *
              </label>
              <input
                id="certification-issuer"
                type="text"
                value={currentItem.issuer}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, issuer: e.target.value })
                }
                className={getFieldError("issuer") ? "form-input form-control-error" : "form-input"}
                placeholder="e.g., Amazon Web Services"
              />
              {getFieldError("issuer") && (
                <p className="mt-1 text-xs text-red-600">
                  {getFieldError("issuer")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="certification-issue-date"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
                >
                  Issue Date (optional)
                </label>
                <input
                  id="certification-issue-date"
                  type="text"
                  value={currentItem.issueDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      issueDate: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., Jan 2023"
                />
              </div>
              <div>
                <label
                  htmlFor="certification-expiry-date"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
                >
                  Expiry Date (optional)
                </label>
                <input
                  id="certification-expiry-date"
                  type="text"
                  value={currentItem.expiryDate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      expiryDate: e.target.value,
                    })
                  }
                  className="form-input"
                  placeholder="e.g., Jan 2026 or No expiration"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="certification-url"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
              >
                Credential URL (optional)
              </label>
              <input
                id="certification-url"
                type="text"
                value={currentItem.url}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    url: e.target.value,
                  })
                }
                className="form-input"
                placeholder="e.g., https://www.credly.com/..."
              />
            </div>

            <div>
              <label
                htmlFor="certification-file"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700"
              >
                Upload File (PDF or image)
              </label>
              <input
                id="certification-file"
                type="file"
                accept=".pdf,image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const fd = new FormData();
                    fd.append("file", f);
                    const { data } = await api.post(
                      "/profiles/candidate/certification-file",
                      fd,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    );
                    if (data?.data?.url) {
                      setCurrentItem({
                        ...currentItem,
                        fileUrl: data.data.url,
                      });
                    }
                  } catch (err) {
                    // ignore upload error for now; a toast could be added
                    console.error("Upload failed", err);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition"
              />
              {currentItem.fileUrl && (
                <div className="mt-2 text-xs">
                  <a
                    href={currentItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View uploaded file
                  </a>
                </div>
              )}
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
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 p-2"
        >
          <Plus className="h-4 w-4" />
          Add Certification
        </button>
      )}
    </div>
  );
}
