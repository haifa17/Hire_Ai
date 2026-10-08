import type { HTMLInputTypeAttribute, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg,image/webp";

export const FIELD_LABEL_CLASS =
  "block text-xs font-medium uppercase tracking-wide text-gray-500";

type FormSectionProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: ReactNode;
};

export function FormSection({ icon: Icon, title, hint, children }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </div>
      {hint && <p className="mb-4 text-xs text-gray-500">{hint}</p>}
      {children}
    </section>
  );
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  /** Classes for the field wrapper, e.g. a grid span. */
  className?: string;
  children: ReactNode;
};

function Field({ id, label, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5", FIELD_LABEL_CLASS)}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

type TextFieldProps = Omit<FieldProps, "children"> & {
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  inputClassName?: string;
  maxLength?: number;
  /** Format or rule to follow, shown under the input. */
  hint?: string;
};

export function TextField({
  id,
  label,
  required,
  className,
  value,
  onChange,
  type,
  placeholder,
  inputClassName,
  maxLength,
  hint,
}: TextFieldProps) {
  const hintId = `${id}-hint`;

  return (
    <Field id={id} label={label} required={required} className={className}>
      <input
        id={id}
        type={type}
        className={cn("form-input", inputClassName)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        aria-describedby={hint ? hintId : undefined}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </Field>
  );
}

type SelectFieldProps = Omit<FieldProps, "children" | "required"> & {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
};

export function SelectField({
  id,
  label,
  className,
  value,
  onChange,
  placeholder,
  options,
}: SelectFieldProps) {
  return (
    <Field id={id} label={label} className={className}>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
