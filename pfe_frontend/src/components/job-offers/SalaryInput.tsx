"use client";

import { Input } from "@/components/ui/Input";

interface SalaryInputProps {
  min?: number;
  max?: number;
  currency?: string;
  onChange: (next: { min?: number; max?: number; currency?: string }) => void;
  minError?: string;
  maxError?: string;
}

export function SalaryInput({
  min,
  max,
  currency,
  onChange,
  minError,
  maxError,
}: Readonly<SalaryInputProps>) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Input
        label="Minimum salary"
        helperText="Optional."
        type="number"
        min={0}
        value={min ?? ""}
        error={minError}
        onChange={(event) =>
          onChange({
            min:
              event.target.value.length > 0
                ? Number(event.target.value)
                : undefined,
            max,
            currency,
          })
        }
      />
      <Input
        label="Maximum salary"
        helperText="Optional. Must be at least the minimum salary."
        type="number"
        min={0}
        value={max ?? ""}
        error={maxError}
        onChange={(event) =>
          onChange({
            min,
            max:
              event.target.value.length > 0
                ? Number(event.target.value)
                : undefined,
            currency,
          })
        }
      />
      <Input
        label="Currency"
        value={currency ?? "USD"}
        maxLength={10}
        onChange={(event) =>
          onChange({
            min,
            max,
            currency: event.target.value.toUpperCase(),
          })
        }
      />
    </div>
  );
}
