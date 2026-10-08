import { useEffect, useRef, useState } from "react";
import { ResumeTemplateId } from "@/domain/models/ResumeTemplate";
import {
  getResumeTemplateDefinition,
  resumeTemplateIds,
} from "@/features/resume-templates/config/resumeTemplates";
import { ResumeDocument } from "@/features/resume-templates/render/ResumeDocument";
import { buildSampleVisualContent } from "@/features/resume-templates/render/sampleContent";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

/**
 * Miniature preview rendered with the exact same engine (`ResumeDocument`) as
 * the real editor, scaled down to fit the card — guarantees the thumbnail a
 * user picks matches the real output pixel-for-pixel.
 */
function TemplateThumbnail({ template }: Readonly<{ template: ResumeTemplateId }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / A4_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sample = buildSampleVisualContent(template);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
      style={{ aspectRatio: `${A4_WIDTH} / ${A4_HEIGHT}` }}
    >
      {scale > 0 && (
        <div
          style={{
            width: A4_WIDTH,
            height: A4_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <ResumeDocument visualContent={sample} showPhoto={false} staticMode />
        </div>
      )}
    </div>
  );
}

interface ResumeTemplatePickerProps {
  value: ResumeTemplateId;
  onChange: (template: ResumeTemplateId) => void;
}

export function ResumeTemplatePicker({
  value,
  onChange,
}: Readonly<ResumeTemplatePickerProps>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
      {resumeTemplateIds.map((templateId) => {
        const definition = getResumeTemplateDefinition(templateId);
        const selected = value === templateId;

        return (
          <button
            key={templateId}
            type="button"
            onClick={() => onChange(templateId)}
            className={cn(
              "group relative rounded-xl border p-2.5 text-left transition-all duration-200",
              selected
                ? "border-[var(--editor-primary)] bg-[var(--editor-primary-soft)] ring-2 ring-[var(--editor-primary)]/20 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80",
            )}
          >
            {selected && (
              <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--editor-primary)] text-white shadow">
                <Check className="h-3 w-3" />
              </span>
            )}
            <TemplateThumbnail template={templateId} />
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-900">{definition.label}</p>
                <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-gray-500">
                  {definition.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
