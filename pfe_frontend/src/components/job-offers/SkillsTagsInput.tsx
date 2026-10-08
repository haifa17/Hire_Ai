"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SkillsTagsInputProps {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}

export function SkillsTagsInput({
  label,
  placeholder,
  values,
  onChange,
}: SkillsTagsInputProps) {
  const [draft, setDraft] = useState("");

  const normalizedValues = useMemo(
    () =>
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    [values],
  );

  const addTag = () => {
    const next = draft.trim();
    if (!next) return;
    if (
      normalizedValues.some((item) => item.toLowerCase() === next.toLowerCase())
    ) {
      setDraft("");
      return;
    }
    onChange([...normalizedValues, next]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <Input
          label={label}
          placeholder={placeholder ?? "Type and press Add"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addTag}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {normalizedValues.length === 0 ? (
          <span className="text-sm text-gray-500">No items added yet.</span>
        ) : (
          normalizedValues.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                className="rounded-full p-0.5 hover:bg-blue-100"
                onClick={() =>
                  onChange(normalizedValues.filter((value) => value !== item))
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
