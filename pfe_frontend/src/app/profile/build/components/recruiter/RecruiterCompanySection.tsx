import Image from "next/image";
import { useTranslations } from "next-intl";
import { Building2, Sparkles } from "lucide-react";
import type {
  RecruiterFormValues,
  SetRecruiterField,
} from "../../hooks/useRecruiterProfileForm";
import {
  ACCEPTED_IMAGE_TYPES,
  FIELD_LABEL_CLASS,
  FormSection,
  SelectField,
  TextField,
} from "./form-controls";

// Stored as-is on the company; each value is also its translation key.
const INDUSTRIES = [
  "Information Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
] as const;

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
] as const;

type RecruiterCompanySectionProps = {
  values: RecruiterFormValues;
  setField: SetRecruiterField;
  logoPreviewUrl: string | null;
  onLogoChange: (file: File | null) => void;
  isEnhancingDescription: boolean;
  descriptionError: string | null;
  onEnhanceDescription: () => void;
};

export function RecruiterCompanySection({
  values,
  setField,
  logoPreviewUrl,
  onLogoChange,
  isEnhancingDescription,
  descriptionError,
  onEnhanceDescription,
}: RecruiterCompanySectionProps) {
  const t = useTranslations("profileBuilder.recruiterSetup");

  return (
    <FormSection
      icon={Building2}
      title={t("sections.companyInfo")}
      hint={t("requiredFieldsHint")}
    >
      <div className="mb-5 flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {logoPreviewUrl ? (
            <Image
              src={logoPreviewUrl}
              alt={t("companyLogoAlt")}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
              {t("companyLogoPlaceholder")}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{t("companyLogo")}</p>
          <p className="text-xs text-gray-500">{t("companyLogoHint")}</p>
          <label className="mt-2 inline-flex cursor-pointer items-center text-xs font-semibold text-blue-600 hover:text-blue-700">
            {t("changeLogo")}{" "}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="hidden"
              onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="companyName"
          label={t("companyFields.name")}
          value={values.companyName}
          onChange={(value) => setField("companyName", value)}
          maxLength={150}
          required
        />
        <TextField
          id="companyPhone"
          label={t("companyFields.phone")}
          value={values.companyPhone}
          onChange={(value) => setField("companyPhone", value)}
          placeholder={t("companyFields.phonePlaceholder")}
          hint={t("phoneHint")}
          maxLength={30}
        />
        <SelectField
          id="companyIndustry"
          label={t("companyFields.industry")}
          value={values.companyIndustry}
          onChange={(value) => setField("companyIndustry", value)}
          placeholder={t("companyFields.industryPlaceholder")}
          options={INDUSTRIES.map((industry) => ({
            value: industry,
            label: t(`industryOptions.${industry}`),
          }))}
        />
        <SelectField
          id="companySize"
          label={t("companyFields.size")}
          value={values.companySize}
          onChange={(value) => setField("companySize", value)}
          placeholder={t("companyFields.sizePlaceholder")}
          options={COMPANY_SIZES.map((size) => ({
            value: size,
            label: t(`sizeOptions.${size}`),
          }))}
        />
        <TextField
          id="companyAddress"
          label={t("companyFields.address")}
          value={values.companyAddress}
          onChange={(value) => setField("companyAddress", value)}
          placeholder={t("companyFields.addressPlaceholder")}
          maxLength={255}
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="companyDescription" className={FIELD_LABEL_CLASS}>
              {t("companyFields.description")}
            </label>
            <button
              type="button"
              onClick={onEnhanceDescription}
              disabled={isEnhancingDescription}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isEnhancingDescription ? t("reformulating") : t("aiReformulate")}
            </button>
          </div>
          <textarea
            id="companyDescription"
            rows={4}
            value={values.companyDescription}
            onChange={(e) => setField("companyDescription", e.target.value)}
            className="form-textarea"
            placeholder={t("companyFields.descriptionPlaceholder")}
          />
          {descriptionError && (
            <p className="mt-1 text-xs text-red-600">{descriptionError}</p>
          )}
        </div>
      </div>
    </FormSection>
  );
}
