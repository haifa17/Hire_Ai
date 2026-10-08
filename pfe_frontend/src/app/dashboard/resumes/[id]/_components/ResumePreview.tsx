import React from "react";
import { ResumeVisualContent } from "@/domain/models/Resume";
import { ResumeDocument } from "@/features/resume-templates/render/ResumeDocument";

interface ResumePreviewProps {
  readonly visualContent: ResumeVisualContent;
  readonly previewCardRef: React.RefObject<HTMLElement | null>;
  readonly showPhoto?: boolean;
}

/**
 * Thin wrapper around the shared `ResumeDocument` renderer — kept as its own
 * file so the editor page doesn't need to know about the rendering internals,
 * and so the `previewCardRef` (used for PDF export) has a stable prop name.
 */
export function ResumePreview({ visualContent, previewCardRef, showPhoto = false }: ResumePreviewProps) {
  return <ResumeDocument visualContent={visualContent} showPhoto={showPhoto} cardRef={previewCardRef} />;
}
