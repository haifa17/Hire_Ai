"use client";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  helperText?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  error,
  helperText,
}: RichTextEditorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={error ? "form-textarea form-control-error" : "form-textarea"}
      />
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {helperText && !error ? (
        <p className="text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
