import { useState, useCallback, useEffect } from "react";
import { ResumeVisualContent } from "@/domain/models/Resume";
import type { UpdateResumeDto } from "@/services/resumeService";

export function useResumeEditor(initialContent: ResumeVisualContent | null, id: string | string[], updateResume: (id: string, data: UpdateResumeDto) => Promise<void>) {
  const [visualContent, setVisualContent] = useState<ResumeVisualContent | null>(initialContent);
  const [historyPast, setHistoryPast] = useState<ResumeVisualContent[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ResumeVisualContent[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  useEffect(() => {
    const applyInitialContent = () => {
      if (initialContent) {
        setVisualContent(initialContent);
        setHistoryPast([]);
        setHistoryFuture([]);
      }
    };
    applyInitialContent();
  }, [initialContent]);

  const cloneVisualContent = useCallback((content: ResumeVisualContent): ResumeVisualContent => {
    return structuredClone(content);
  }, []);

  const handleVisualChange = useCallback((updater: (prev: ResumeVisualContent) => ResumeVisualContent) => {
    setVisualContent((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (next === prev) return prev;
      setHistoryPast((past) => [...past.slice(-49), cloneVisualContent(prev)]);
      setHistoryFuture([]);
      return next;
    });
  }, [cloneVisualContent]);

  const undo = useCallback(() => {
    const previous = historyPast.at(-1);
    if (!previous || !visualContent) return;

    setVisualContent(cloneVisualContent(previous));
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [cloneVisualContent(visualContent), ...future.slice(0, 49)]);
  }, [historyPast, visualContent, cloneVisualContent]);

  const redo = useCallback(() => {
    const nextState = historyFuture.at(0);
    if (!nextState || !visualContent) return;

    setVisualContent(cloneVisualContent(nextState));
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past.slice(-49), cloneVisualContent(visualContent)]);
  }, [historyFuture, visualContent, cloneVisualContent]);

  const save = useCallback(async (title: string) => {
    if (!visualContent || !id) return;
    setSaveErrorMessage("");
    try {
      setSaving(true);
      await updateResume(id as string, {
        title,
        content: visualContent as unknown as Record<string, unknown>,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setSaveErrorMessage("Unable to save changes right now. Please retry.");
      console.error("Failed to save visual resume", saveError);
    } finally {
      setSaving(false);
    }
  }, [visualContent, id, updateResume]);

  return {
    visualContent,
    setVisualContent,
    handleVisualChange,
    undo,
    redo,
    save,
    saving,
    saved,
    saveErrorMessage,
    canUndo: historyPast.length > 0,
    canRedo: historyFuture.length > 0,
    historyPast // Exporting for the toolbar disabled state
  };
}
