"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { FormField } from "./FormField";

type PasswordFieldProps = Omit<
  ComponentProps<typeof FormField>,
  "icon" | "type" | "trailing"
> & {
  /** Accessible labels for the visibility toggle (pass translated strings). */
  showLabel: string;
  hideLabel: string;
};

export function PasswordField({ showLabel, hideLabel, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <FormField
      placeholder="••••••••"
      autoComplete="new-password"
      {...props}
      icon={Lock}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    />
  );
}