import Image from "next/image";
import { useTranslations } from "next-intl";
import { UserCircle2 } from "lucide-react";
import type {
  RecruiterFormValues,
  SetRecruiterField,
} from "../../hooks/useRecruiterProfileForm";
import { ACCEPTED_IMAGE_TYPES, FormSection, TextField } from "./form-controls";

type RecruiterPersonalSectionProps = {
  values: RecruiterFormValues;
  setField: SetRecruiterField;
  avatarPreviewUrl: string | null;
  onAvatarChange: (file: File | null) => void;
};

export function RecruiterPersonalSection({
  values,
  setField,
  avatarPreviewUrl,
  onAvatarChange,
}: RecruiterPersonalSectionProps) {
  const t = useTranslations("profileBuilder.recruiterSetup");
  const initials =
    `${values.firstName[0] ?? "R"}${values.lastName[0] ?? "U"}`.toUpperCase();

  return (
    <FormSection
      icon={UserCircle2}
      title={t("sections.personalInfo")}
      hint={t("requiredFieldsHint")}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[120px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-blue-50">
            {avatarPreviewUrl ? (
              <Image
                src={avatarPreviewUrl}
                alt={t("avatarAlt")}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-blue-700">
                {initials}
              </div>
            )}
          </div>
          <label className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
            {t("changePhoto")}{" "}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="hidden"
              onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="firstName"
            label={t("fields.firstName")}
            value={values.firstName}
            onChange={(value) => setField("firstName", value)}
            maxLength={100}
            required
          />
          <TextField
            id="lastName"
            label={t("fields.lastName")}
            value={values.lastName}
            onChange={(value) => setField("lastName", value)}
            maxLength={100}
            required
          />
          <TextField
            id="position"
            label={t("fields.jobTitle")}
            value={values.position}
            onChange={(value) => setField("position", value)}
            placeholder={t("fields.jobTitlePlaceholder")}
            maxLength={150}
            required
          />
          <TextField
            id="email"
            type="email"
            label={t("fields.email")}
            value={values.email}
            onChange={(value) => setField("email", value)}
            inputClassName="bg-gray-50"
            hint={t("emailHint")}
            maxLength={255}
            required
          />
          <TextField
            id="department"
            label={t("fields.department")}
            value={values.department}
            onChange={(value) => setField("department", value)}
            placeholder={t("fields.departmentPlaceholder")}
            maxLength={150}
            required
          />
          <TextField
            id="phone"
            label={t("fields.phone")}
            value={values.phone}
            onChange={(value) => setField("phone", value)}
            placeholder={t("fields.phonePlaceholder")}
            hint={t("phoneHint")}
            maxLength={30}
          />
          <TextField
            id="address"
            label={t("fields.address")}
            value={values.address}
            onChange={(value) => setField("address", value)}
            placeholder={t("fields.addressPlaceholder")}
            maxLength={255}
            className="sm:col-span-2"
          />
        </div>
      </div>
    </FormSection>
  );
}
