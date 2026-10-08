import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FormFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "name" | "className"
> & {
  id: string;
  name: string;
  label: string;
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Element rendered at the right edge of the input (e.g. a toggle). */
  trailing?: ReactNode;
  /** Element rendered opposite the label (e.g. "Forgot password?"). */
  labelAction?: ReactNode;
};

export function FormField({
  id,
  name,
  label,
  icon: Icon,
  hint,
  trailing,
  labelAction,
  ...inputProps
}: FormFieldProps) {
  const hintId = `${id}-hint`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          name={name}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            "form-input",
            Icon && "pl-9",
            trailing && "pr-10",
          )}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}