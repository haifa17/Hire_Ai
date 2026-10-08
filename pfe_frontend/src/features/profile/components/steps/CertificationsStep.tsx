"use client";

import { useState } from "react";
import {
  Award,
  Link,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useProfileStore } from "@/store/useProfileStore";
import { Certification } from "@/domain/models/Profile";

interface ApiEnvelope<T> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
  path: string;
  timestamp: string;
}

const emptyForm: Omit<Certification, "id"> = {
  name: "",
  issuingOrganization: "",
  issueDate: "",
  expiryDate: null,
  credentialId: "",
  credentialUrl: "",
  fileUrl: "",
};

interface CertCardProps {
  readonly cert: Certification;
  readonly onEdit: (cert: Certification) => void;
  readonly onDelete: (id: string) => void;
}

function CertCard({ cert, onEdit, onDelete }: CertCardProps) {
  const t = useTranslations("profileBuilder.steps.certifications");
  const locale = useLocale();
  const formatDate = (d: string) => {
    if (!d) return "";
    const [year, month] = d.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl bg-white">
      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
        <Award className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{cert.name}</h4>
            <p className="text-sm text-blue-600 font-medium">
              {cert.issuingOrganization}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(cert)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label={t("editButton")}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(cert.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label={t("deleteButton")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {cert.issueDate && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {t("issued", { date: formatDate(cert.issueDate) })}
            {cert.expiryDate &&
              ` ${t("expires", { date: formatDate(cert.expiryDate) })}`}
          </p>
        )}
        {cert.credentialId && (
          <p className="text-xs text-gray-400 mt-0.5">
            {t("credentialId", { id: cert.credentialId })}
          </p>
        )}
        {cert.credentialUrl && (
          <a
            href={cert.credentialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1"
          >
            <Link className="w-3 h-3" />
            {t("viewCredential")}
          </a>
        )}
        {cert.fileUrl && (
          <a
            href={cert.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1 ml-3"
          >
            <Upload className="w-3 h-3" />
            {t("viewFile")}
          </a>
        )}
      </div>
    </div>
  );
}

interface CertFormProps {
  readonly initialData?: Certification;
  readonly onSave: (data: Omit<Certification, "id">) => void;
  readonly onCancel: () => void;
}

function CertForm({ initialData, onSave, onCancel }: CertFormProps) {
  const t = useTranslations("profileBuilder.steps.certifications");
  const [form, setForm] = useState<Omit<Certification, "id">>(
    initialData
      ? {
          name: initialData.name,
          issuingOrganization: initialData.issuingOrganization,
          issueDate: initialData.issueDate,
          expiryDate: initialData.expiryDate,
          credentialId: initialData.credentialId,
          credentialUrl: initialData.credentialUrl,
          fileUrl: initialData.fileUrl ?? "",
        }
      : emptyForm,
  );

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const inputClass = "form-input";

  async function handleFileChange(file: File | null) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<ApiEnvelope<{ url: string }>>(
      "/profiles/candidate/certification-file",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    update("fileUrl", response.data.data.url);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50">
      <h3 className="text-sm font-semibold text-gray-800">
        {initialData ? t("editTitle") : t("addTitle")}
      </h3>
      <p className="text-xs text-gray-500">{t("requiredFieldsHint")}</p>

      <div>
        <label
          htmlFor="certName"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {t("fields.name")} <span className="text-red-500">*</span>
        </label>
        <input
          id="certName"
          type="text"
          placeholder={t("fields.namePlaceholder")}
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="certOrg"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {t("fields.issuingOrganization")} <span className="text-red-500">*</span>
        </label>
        <input
          id="certOrg"
          type="text"
          placeholder={t("fields.issuingOrganizationPlaceholder")}
          value={form.issuingOrganization}
          onChange={(e) => update("issuingOrganization", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="issueDate"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("fields.issueDate")}
          </label>
          <input
            id="issueDate"
            type="month"
            value={form.issueDate}
            onChange={(e) => update("issueDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("fields.expiryDate")}{" "}
            <span className="text-gray-400 font-normal">
              {t("fields.optional")}
            </span>
          </label>
          <input
            type="month"
            value={form.expiryDate ?? ""}
            onChange={(e) => update("expiryDate", e.target.value || null)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("fields.credentialIdField")}{" "}
          <span className="text-gray-400 font-normal">
            {t("fields.optional")}
          </span>
        </label>
        <input
          type="text"
          placeholder={t("fields.credentialIdPlaceholder")}
          value={form.credentialId}
          onChange={(e) => update("credentialId", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("fields.credentialUrl")}{" "}
          <span className="text-gray-400 font-normal">
            {t("fields.optional")}
          </span>
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="url"
            placeholder={t("fields.credentialUrlPlaceholder")}
            value={form.credentialUrl}
            onChange={(e) => update("credentialUrl", e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">{t("fields.credentialUrlHint")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("fields.file")}{" "}
          <span className="text-gray-400 font-normal">
            {t("fields.optional")}
          </span>
        </label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => {
            void handleFileChange(e.target.files?.[0] ?? null);
          }}
          className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {form.fileUrl && (
          <a
            href={form.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Upload className="w-3 h-3" />
            {t("viewUploadedFile")}
          </a>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(form)}
          disabled={!form.name || !form.issuingOrganization}
        >
          {t("saveEntry")}
        </Button>
      </div>
    </div>
  );
}

export function CertificationsStep() {
  const t = useTranslations("profileBuilder.steps.certifications");
  const {
    profile,
    addCertification,
    updateCertification,
    removeCertification,
  } = useProfileStore();
  const [showForm, setShowForm] = useState(profile.certifications.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSaveNew(data: Omit<Certification, "id">) {
    addCertification(data);
    setShowForm(false);
  }

  function handleSaveEdit(data: Omit<Certification, "id">) {
    if (!editingId) return;
    updateCertification(editingId, data);
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
            {t("addCertification")}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">{t("subtitle")}</p>

      <div className="space-y-3">
        {profile.certifications.map((cert) =>
          editingId === cert.id ? (
            <CertForm
              key={cert.id}
              initialData={cert}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CertCard
              key={cert.id}
              cert={cert}
              onEdit={(c) => {
                setEditingId(c.id);
                setShowForm(false);
              }}
              onDelete={removeCertification}
            />
          ),
        )}

        {showForm && (
          <CertForm
            onSave={handleSaveNew}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!showForm && !editingId && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("addAnotherCertification")}
          </button>
        )}
      </div>
    </div>
  );
}
