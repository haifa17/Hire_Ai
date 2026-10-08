import { useTranslations } from "next-intl";
import type { ExternalOffer } from "@/domain/models/OfferMatch";
import { cn } from "@/lib/utils";
import { MIN_DESCRIPTION_LENGTH } from "../_hooks/useOfferMatch";

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  optionalLabel?: string;
};

function FieldLabel({ htmlFor, label, optionalLabel }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {optionalLabel && <span className="ml-1 font-normal text-slate-400">({optionalLabel})</span>}
    </label>
  );
}

type ExternalOfferFormProps = {
  value: ExternalOffer;
  onChange: (field: keyof ExternalOffer, value: string) => void;
};

export function ExternalOfferForm({ value, onChange }: ExternalOfferFormProps) {
  const t = useTranslations("offerMatch.external");
  const descriptionLength = value.description.trim().length;
  const isDescriptionTooShort = descriptionLength > 0 && descriptionLength < MIN_DESCRIPTION_LENGTH;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-500">{t("hint")}</p>

      <div>
        <FieldLabel htmlFor="external-title" label={t("titleLabel")} />
        <input
          id="external-title"
          value={value.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={200}
          required
          className="form-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="external-company" label={t("companyLabel")} optionalLabel={t("optional")} />
          <input
            id="external-company"
            value={value.company ?? ""}
            onChange={(e) => onChange("company", e.target.value)}
            maxLength={200}
            className="form-input"
          />
        </div>
        <div>
          <FieldLabel htmlFor="external-location" label={t("locationLabel")} optionalLabel={t("optional")} />
          <input
            id="external-location"
            value={value.location ?? ""}
            onChange={(e) => onChange("location", e.target.value)}
            maxLength={200}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="external-description" label={t("descriptionLabel")} />
        <textarea
          id="external-description"
          value={value.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={10}
          maxLength={20000}
          required
          aria-describedby="external-description-count"
          className="form-textarea resize-y"
        />
        <p
          id="external-description-count"
          className={cn(
            "mt-1.5 flex justify-between text-xs",
            isDescriptionTooShort ? "text-amber-700" : "text-slate-400",
          )}
        >
          <span>{t("minimum", { min: MIN_DESCRIPTION_LENGTH })}</span>
          <span>{t("characters", { count: descriptionLength })}</span>
        </p>
      </div>
    </div>
  );
}
