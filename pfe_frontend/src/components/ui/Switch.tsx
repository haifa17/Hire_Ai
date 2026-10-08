import { cn } from "@/lib/utils";

type SwitchProps = {
  /** Accessible name; the switch has no visible text of its own. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-gray-300",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
