"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Download,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  BarChart3,
  Palette,
} from "lucide-react";

import { useResumeStore } from "@/store/useResumeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import {
  ResumeVisualContent,
  SectionType,
} from "@/domain/models/Resume";
import type { OptimizeResumeResult } from "@/services/resumeService";

import {
  resolvePhotoUrl,
  buildInitialVisualContent,
  createSection,
} from "./_utils/resume-helpers";
import { compressImageToDataUrl, exportCvAsPrintPdf } from "./_utils/pdf-utils";
import { useResumeEditor } from "./_hooks/useResumeEditor";

import { EditorSidebar, SidebarTab } from "./_components/EditorSidebar";
import { ResumePreview } from "./_components/ResumePreview";
import { SectionEditor } from "./_components/SectionEditor";
import { AtsScorePanel } from "./_components/AtsScorePanel";
import { OptimizeCvModal } from "./_components/OptimizeCvModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.25] as const;

function ShortcutKbd({ label }: Readonly<{ label: string }>) {
  return (
    <kbd className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-[9px] font-mono">
      {label}
    </kbd>
  );
}

export default function ResumeDetailPage() {
  const t = useTranslations("resumesEditor.editor");
  const { id } = useParams();
  const { user } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);
  const {
    currentResume,
    fetchResume,
    updateResume,
    scoreResume,
    optimizeResume,
    loading,
    scoringResume,
    optimizingResume,
    error,
    clearCurrentResume,
  } = useResumeStore();

  const [resumeTitle, setResumeTitle] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("header");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("Intermediate");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showAtsScore, setShowAtsScore] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizeResumeResult | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const previewCardRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const [initialVisualContent, setInitialVisualContent] =
    useState<ResumeVisualContent | null>(null);

  useEffect(() => {
    if (id) fetchResume(id as string);
    return () => clearCurrentResume();
  }, [id, fetchResume, clearCurrentResume]);

  useEffect(() => {
    const applyResumeContent = () => {
      if (!currentResume || !user) return;

      const fallbackHeader: ResumeVisualContent["header"] = {
        fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        professionalTitle: user.professionalTitle ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        address: user.address ?? "",
        socialLinks: [],
        alignment: "auto",
        contactOrder: ["email", "phone", "address"],
      };

      const profilePhoto =
        resolvePhotoUrl(user.avatarUrl) ||
        resolvePhotoUrl(profile.personalInfo.photoUrl) ||
        "";
      const initial = buildInitialVisualContent(
        currentResume.content,
        fallbackHeader,
        profilePhoto,
      );

      setInitialVisualContent(initial);
      setResumeTitle(currentResume.title);
      setActiveSectionId(initial.sections[0]?.id ?? "");
    };

    applyResumeContent();
  }, [currentResume, user, profile.personalInfo.photoUrl]);

  useEffect(() => {
    if (!id || !currentResume || currentResume.atsScore || scoringResume)
      return;
    void scoreResume(id as string);
  }, [id, currentResume, scoringResume, scoreResume]);

  const {
    visualContent,
    handleVisualChange,
    undo,
    redo,
    save,
    saving,
    saved,
    saveErrorMessage,
    canUndo,
    canRedo,
  } = useResumeEditor(initialVisualContent, id as string, updateResume);

  const activeSection = useMemo(() => {
    return (
      visualContent?.sections.find((s) => s.id === activeSectionId) || null
    );
  }, [visualContent, activeSectionId]);

  const addSection = (title: string, type: SectionType) => {
    const section = createSection(title, type, "", []);
    handleVisualChange((p) => ({ ...p, sections: [...p.sections, section] }));
    setActiveSectionId(section.id);
  };

  const removeSection = (sectionId: string) => {
    handleVisualChange((p) => ({
      ...p,
      sections: p.sections.filter((s) => s.id !== sectionId),
    }));
    if (activeSectionId === sectionId) setActiveSectionId("");
  };

  const duplicateSection = (sectionId: string) => {
    handleVisualChange((p) => {
      const source = p.sections.find((s) => s.id === sectionId);
      if (!source) return p;
      const duplicated = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} (Copy)`,
        items: [...source.items],
      };
      const idx = p.sections.findIndex((s) => s.id === sectionId);
      const sections = [...p.sections];
      sections.splice(idx + 1, 0, duplicated);
      return { ...p, sections };
    });
  };

  const shiftSection = (sectionId: string, direction: -1 | 1) => {
    handleVisualChange((p) => {
      const idx = p.sections.findIndex((s) => s.id === sectionId);
      const targetIdx = idx + direction;
      if (idx < 0 || targetIdx < 0 || targetIdx >= p.sections.length) return p;
      const sections = [...p.sections];
      const [section] = sections.splice(idx, 1);
      sections.splice(targetIdx, 0, section);
      return { ...p, sections };
    });
  };

  const handlePrintPdf = async () => {
    if (!previewCardRef.current || exportingPdf) return;
    try {
      setExportingPdf(true);
      await exportCvAsPrintPdf(
        previewCardRef.current as HTMLElement,
        resumeTitle || "resume",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("exportFailed");
      alert(msg);
      console.error("PDF export failed:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const result = await compressImageToDataUrl(file);
      handleVisualChange((p) => ({ ...p, photoUrl: result }));
    } catch {
      // Fallback or error handle
    }
  };

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_LEVELS.find((l) => l > z);
      return next ?? z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_LEVELS].reverse().find((l) => l < z);
      return prev ?? z;
    });
  }, []);

  const fitToWidth = useCallback(() => {
    if (!previewScrollRef.current) return;
    const containerW = previewScrollRef.current.clientWidth - 80; // padding
    const A4_PX = 794; // 210mm at 96dpi
    const computed = Math.min(Math.round((containerW / A4_PX) * 10) / 10, 1.25);
    setZoom(Math.max(0.5, computed));
  }, []);

  const handleOptimizeCv = async () => {
    if (!currentResume || !visualContent) return;
    try {
      const result = await optimizeResume(currentResume.id, {
        resumeContent: visualContent,
        missingKeywords: currentResume.atsScore?.missingKeywords ?? [],
        suggestions: currentResume.atsScore?.suggestions ?? [],
      });
      setOptimizationResult(result);
      setShowOptimizeModal(true);
    } catch (err) {
      console.error("CV Optimization error:", err);
    }
  };

  const handleApplyOptimization = () => {
    if (!optimizationResult?.optimizedContent) return;

    const fallbackHeader: ResumeVisualContent["header"] = {
      fullName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
      professionalTitle: user?.professionalTitle ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
      socialLinks: [],
      alignment: "auto",
      contactOrder: ["email", "phone", "address"],
    };

    const profilePhoto =
      resolvePhotoUrl(user?.avatarUrl) ||
      resolvePhotoUrl(profile.personalInfo.photoUrl) ||
      "";

    const updated = buildInitialVisualContent(
      optimizationResult.optimizedContent,
      fallbackHeader,
      profilePhoto
    );

    handleVisualChange(() => updated);
    setShowOptimizeModal(false);
    setOptimizationResult(null);
  };

  if (loading || !currentResume || !visualContent) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #F0F4FF 0%, #F8FAFC 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">
              {t("loadingTitle")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("loadingSubtitle")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#F0F4FA" }}
    >
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <header className="flex h-[60px] shrink-0 items-center justify-between gap-2 px-3 sm:px-5 bg-white border-b border-gray-200/80 z-50 shadow-sm">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard/resumes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setMobilePanelOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 lg:hidden"
            title={t("openEditorPanel")}
          >
            <Palette className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:block">
              {t("resumeEditorLabel")}
            </span>
            <input
              value={resumeTitle}
              onChange={(e) => setResumeTitle(e.target.value)}
              className="w-32 truncate bg-transparent text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0 sm:w-52"
              title={t("clickToRename")}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant={showAtsScore ? "primary" : "outline"}
            size="sm"
            className={showAtsScore ? "bg-slate-900 hover:bg-slate-800" : "text-slate-600"}
            onClick={() => setShowAtsScore((value) => !value)}
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("atsScoreButton")}</span>
          </Button>

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-50 p-1 border border-gray-200">
            <button
              onClick={undo}
              disabled={!canUndo}
              title={t("undo")}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white hover:text-[var(--editor-primary)] disabled:opacity-25 transition-all text-gray-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title={t("redo")}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white hover:text-[var(--editor-primary)] disabled:opacity-25 transition-all text-gray-500"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export PDF */}
          <Button variant="outline" size="sm" onClick={handlePrintPdf} disabled={exportingPdf} isLoading={exportingPdf}>
            {!exportingPdf && <Download className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{exportingPdf ? t("exporting") : t("exportPdf")}</span>
          </Button>

          {/* Save */}
          <Button
            size="sm"
            className="bg-[var(--editor-primary)] hover:bg-[var(--editor-primary-hover)] shadow-md shadow-blue-200"
            onClick={() => save(resumeTitle)}
            disabled={saving}
            isLoading={saving}
          >
            {!saving && (saved ? <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />)}
            {saved ? t("saved") : t("save")}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Mobile/tablet backdrop for the editor panel */}
        {mobilePanelOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            aria-label={t("closeMobilePanel")}
            onClick={() => setMobilePanelOpen(false)}
          />
        )}

        {/* ── Left Panel: Editor ──────────────────────────────────────── */}
        <div
          className={`fixed left-0 top-[60px] bottom-0 z-40 flex w-[86vw] max-w-[420px] flex-col overflow-hidden border-r border-gray-200 bg-white transition-transform duration-300 lg:static lg:z-30 lg:w-[420px] lg:max-w-none lg:translate-x-0 xl:w-[460px] ${
            mobilePanelOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {(error || saveErrorMessage) && (
              <div className="mx-5 mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {error || saveErrorMessage}
              </div>
            )}

            <div className="p-5 pb-0">
              <EditorSidebar
                visualContent={visualContent}
                handleVisualChange={handleVisualChange}
                activeSectionId={activeSectionId}
                setActiveSectionId={(sectionId) => {
                  setActiveSectionId(sectionId);
                  setSidebarTab("sections");
                }}
                activeTab={sidebarTab}
                onTabChange={setSidebarTab}
                onAddSection={addSection}
                onRemoveSection={removeSection}
                onDuplicateSection={duplicateSection}
                onShiftSection={shiftSection}
                onReorderSections={(draggedId, overId) => {
                  handleVisualChange((p) => {
                    const fromIdx = p.sections.findIndex(
                      (s) => s.id === draggedId,
                    );
                    const toIdx = p.sections.findIndex((s) => s.id === overId);
                    if (fromIdx < 0 || toIdx < 0) return p;
                    const sections = [...p.sections];
                    const [moved] = sections.splice(fromIdx, 1);
                    sections.splice(toIdx, 0, moved);
                    return { ...p, sections };
                  });
                }}
                onPhotoUpload={handlePhotoUpload}
                onUseProfilePhoto={() => {
                  const p =
                    resolvePhotoUrl(user?.avatarUrl) ||
                    resolvePhotoUrl(profile.personalInfo.photoUrl) ||
                    "";
                  handleVisualChange((v) => ({ ...v, photoUrl: p }));
                }}
                onReorderContact={(draggedId, overId) => {
                  handleVisualChange((p) => {
                    const order = [
                      ...(p.header.contactOrder || [
                        "email",
                        "phone",
                        "address",
                      ]),
                    ];
                    const fromIdx = order.indexOf(draggedId);
                    const toIdx = order.indexOf(overId);
                    if (fromIdx < 0 || toIdx < 0) return p;
                    order.splice(fromIdx, 1);
                    order.splice(toIdx, 0, draggedId);
                    return {
                      ...p,
                      header: { ...p.header, contactOrder: order },
                    };
                  });
                }}
                showPhoto={showPhoto}
                onTogglePhoto={() => setShowPhoto((v) => !v)}
              />
            </div>

            {sidebarTab === "sections" && activeSection && (
            <div className="p-5 pt-4 border-t border-gray-100 mt-4">
              <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--editor-primary)] bg-[var(--editor-primary-soft)] w-fit px-3 py-1.5 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--editor-primary)] animate-pulse" />
                {t("editingSection", { title: activeSection.title })}
              </div>
              <SectionEditor
                activeSection={activeSection}
                newItemText={newItemText}
                newSkillLevel={newSkillLevel}
                onSetNewItemText={setNewItemText}
                onSetNewSkillLevel={setNewSkillLevel}
                onAddSectionItem={() => {
                  if (!activeSection || !newItemText.trim()) return;
                  const itemsToAdd = newItemText.split("\n").filter(Boolean);
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === activeSection.id
                        ? { ...s, items: [...s.items, ...itemsToAdd] }
                        : s,
                    ),
                  }));
                  setNewItemText("");
                }}
                onRemoveSectionItem={(id, idx) => {
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === id
                        ? { ...s, items: s.items.filter((_, i) => i !== idx) }
                        : s,
                    ),
                  }));
                }}
                onUpdateSectionItem={(id, idx, val) => {
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            items: s.items.map((it, i) =>
                              i === idx ? val : it,
                            ),
                          }
                        : s,
                    ),
                  }));
                }}
                onMoveSectionItem={(id, idx, dir) => {
                  handleVisualChange((p) => {
                    const sIdx = p.sections.findIndex((s) => s.id === id);
                    if (sIdx < 0) return p;
                    const items = [...p.sections[sIdx].items];
                    const tIdx = idx + dir;
                    if (tIdx < 0 || tIdx >= items.length) return p;
                    const [moved] = items.splice(idx, 1);
                    items.splice(tIdx, 0, moved);
                    const sections = [...p.sections];
                    sections[sIdx] = { ...sections[sIdx], items };
                    return { ...p, sections };
                  });
                }}
                onApplyExperienceItems={(id, items) => {
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === id ? { ...s, items } : s,
                    ),
                  }));
                }}
                onUpdateSectionContent={(id, content) => {
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === id ? { ...s, content } : s,
                    ),
                  }));
                }}
                onUpdateSectionTitle={(id, title) => {
                  handleVisualChange((p) => ({
                    ...p,
                    sections: p.sections.map((s) =>
                      s.id === id ? { ...s, title } : s,
                    ),
                  }));
                }}
              />
            </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: CV Preview Desk ────────────────────────────── */}
        <div className="relative flex-1 flex flex-col overflow-hidden bg-[#E8EDF5]">
          {/* Preview Toolbar */}
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 z-20">
            {/* Left: page info */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-gray-500">
                <FileText className="h-4 w-4 text-[var(--editor-primary)]" />
                <span className="hidden text-xs font-semibold text-gray-700 sm:inline">
                  {t("livePreview")}
                </span>
              </div>
              <div className="hidden h-4 w-px bg-gray-200 sm:block" />
              <span className="hidden text-[10px] font-medium text-gray-400 tracking-wide md:inline">
                {t("a4Size")}
              </span>
              <Badge variant="success" size="sm">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
                {t("live")}
              </Badge>
            </div>

            {/* Right: zoom controls */}
            <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={zoomOut}
                disabled={zoom <= ZOOM_LEVELS[0]}
                title={t("zoomOut")}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 transition-all"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="h-7 min-w-[52px] rounded-md text-[11px] font-bold text-gray-600 hover:bg-gray-100 transition-all tabular-nums"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                title={t("zoomIn")}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 transition-all"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-0.5" />
              <button
                onClick={fitToWidth}
                title={t("fitToWidth")}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable Desk */}
          <div
            ref={previewScrollRef}
            className={`flex-1 overflow-auto transition-all duration-300 ${showAtsScore ? "blur-[1px] brightness-[0.92]" : ""}`}
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, #D6DFF0 0%, #C8D3E8 100%)",
              backgroundImage: `
                radial-gradient(ellipse at 50% 0%, #D6DFF0 0%, #C8D3E8 100%),
                repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,0.04) 24px, rgba(255,255,255,0.04) 25px),
                repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,0.04) 24px, rgba(255,255,255,0.04) 25px)
              `,
            }}
          >
            <div
              className="flex justify-center py-10 pb-16"
              style={{ minHeight: "100%", minWidth: `${794 * zoom + 120}px` }}
            >
              {/* Paper shadow + scale wrapper */}
              <div
                style={{
                  transformOrigin: "top center",
                  transform: `scale(${zoom})`,
                  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Subtle paper stack behind */}
                <div
                  className="absolute -bottom-1 left-2 right-2 rounded-sm"
                  style={{
                    height: "100%",
                    background: "#e8e8e8",
                    zIndex: 0,
                    transform: "translateY(4px)",
                  }}
                />
                <div
                  className="absolute -bottom-0.5 left-1 right-1 rounded-sm"
                  style={{
                    height: "100%",
                    background: "#f0f0f0",
                    zIndex: 0,
                    transform: "translateY(2px)",
                  }}
                />
                <div className="relative" style={{ zIndex: 1 }}>
                  <ResumePreview
                    visualContent={visualContent}
                    previewCardRef={previewCardRef}
                    showPhoto={showPhoto}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info bar */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-white/60 backdrop-blur-sm border-t border-gray-200/60">
            <span className="text-[10px] text-gray-400">
              {t.rich("shortcutTip", {
                kbdZ: () => <ShortcutKbd label="Ctrl+Z" />,
                kbdY: () => <ShortcutKbd label="Ctrl+Y" />,
              })}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {t("wysiwygNote")}
            </span>
          </div>

          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-full max-w-[430px] transition-transform duration-300 ease-out ${showAtsScore ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="pointer-events-auto h-full">
              <AtsScorePanel
                resumeId={currentResume.id}
                score={currentResume.atsScore ?? null}
                loading={scoringResume}
                optimizing={optimizingResume}
                onRescore={async (resumeId) => {
                  await scoreResume(resumeId);
                }}
                onOptimizeCv={handleOptimizeCv}
                onClose={() => setShowAtsScore(false)}
              />
            </div>
          </div>
        </div>
      </main>

      <OptimizeCvModal
        isOpen={showOptimizeModal}
        onClose={() => setShowOptimizeModal(false)}
        onApply={handleApplyOptimization}
        addedKeywords={optimizationResult?.addedKeywords ?? []}
        modifiedSections={optimizationResult?.modifiedSections ?? []}
        summaryOfChanges={optimizationResult?.summaryOfChanges ?? ""}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `,
        }}
      />
    </div>
  );
}
