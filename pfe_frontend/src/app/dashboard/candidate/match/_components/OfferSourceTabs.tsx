import { useTranslations } from "next-intl";
import { Building2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OfferSource } from "../_hooks/useOfferMatch";

const SOURCES = [
  { value: "platform", icon: Building2 },
  { value: "external", icon: Globe },
] as const;

type OfferSourceTabsProps = {
  value: OfferSource;
  onChange: (source: OfferSource) => void;
};

export function OfferSourceTabs({ value, onChange }: OfferSourceTabsProps) {
  const t = useTranslations("offerMatch.tabs");

  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {SOURCES.map(({ value: source, icon: Icon }) => {
        const isActive = value === source;
        return (
          <button
            key={source}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(source)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(source)}</span>
          </button>
        );
      })}
    </div>
  );
}
