import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  UserCircle2, Palette, Type, MoveVertical, PlusCircle,
  Trash2, Copy, ArrowUp, ArrowDown, Upload, GripVertical
} from "lucide-react";
import { ResumeVisualContent, SectionType, PhotoShape, PhotoPosition, FONT_OPTIONS } from "@/domain/models/Resume";
import { ResumeTemplatePicker } from "@/features/resume-templates/components/ResumeTemplatePicker";
import { getPhotoShapeClass, clampPhotoSize } from "../_utils/resume-helpers";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface EditorSidebarProps {
  visualContent: ResumeVisualContent;
  handleVisualChange: (updater: (prev: ResumeVisualContent) => ResumeVisualContent) => void;
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  onAddSection: (title: string, type: SectionType) => void;
  onRemoveSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onShiftSection: (id: string, direction: -1 | 1) => void;
  onReorderSections: (draggedId: string, overId: string) => void;
  onPhotoUpload: (file: File) => void;
  onUseProfilePhoto: () => void;
  onReorderContact: (draggedId: string, overId: string) => void;
  showPhoto: boolean;
  onTogglePhoto: () => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export type SidebarTab = "header" | "style" | "photo" | "sections";

export function EditorSidebar(props: EditorSidebarProps) {
  const {
    visualContent, handleVisualChange, activeSectionId, setActiveSectionId,
    onAddSection, onRemoveSection, onDuplicateSection, onShiftSection,
    onReorderSections, onPhotoUpload, onUseProfilePhoto,
    showPhoto, onTogglePhoto, activeTab, onTabChange,
  } = props;

  const t = useTranslations("resumesEditor.editorSidebar");

  const TABS: TabItem<SidebarTab>[] = [
    { id: "header", label: t("tabs.header"), icon: <UserCircle2 className="h-5 w-5" /> },
    { id: "style", label: t("tabs.style"), icon: <Palette className="h-5 w-5" /> },
    { id: "photo", label: t("tabs.photo"), icon: <Upload className="h-5 w-5" /> },
    { id: "sections", label: t("tabs.sections"), icon: <MoveVertical className="h-5 w-5" /> },
  ];

  const [newSectionTitle, setNewSectionTitle] = useState(t("defaultSectionTitle"));
  const [newSectionType, setNewSectionType] = useState<SectionType>("custom");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <Tabs tabs={TABS} active={activeTab} onChange={onTabChange} />

      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {activeTab === "header" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <Input
                label={t("header.fullName")}
                value={visualContent.header.fullName}
                onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, fullName: e.target.value } }))}
              />
              <Input
                label={t("header.professionalTitle")}
                value={visualContent.header.professionalTitle}
                onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, professionalTitle: e.target.value } }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t("header.email")}
                  value={visualContent.header.email}
                  onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, email: e.target.value } }))}
                />
                <Input
                  label={t("header.phone")}
                  value={visualContent.header.phone}
                  onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, phone: e.target.value } }))}
                />
              </div>
              <Input
                label={t("header.address")}
                value={visualContent.header.address}
                onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, address: e.target.value } }))}
              />
              <Select
                label={t("header.alignment")}
                value={visualContent.header.alignment || "auto"}
                onChange={(e) => handleVisualChange(p => ({ ...p, header: { ...p.header, alignment: e.target.value as "auto" | "left" | "center" | "right" } }))}
                options={[
                  { value: "auto", label: t("header.alignmentDefault") },
                  { value: "left", label: t("header.alignmentLeft") },
                  { value: "center", label: t("header.alignmentCenter") },
                  { value: "right", label: t("header.alignmentRight") },
                ]}
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("header.socialLinks")}</label>
              {(visualContent.header.socialLinks || []).map((link, idx) => (
                <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={link.network}
                      onChange={(e) => {
                        const next = [...(visualContent.header.socialLinks || [])];
                        next[idx] = { ...next[idx], network: e.target.value };
                        handleVisualChange(p => ({ ...p, header: { ...p.header, socialLinks: next } }));
                      }}
                      className="form-input w-1/2"
                      placeholder={t("header.platformPlaceholder")}
                    />
                    <input
                      value={link.label || ""}
                      onChange={(e) => {
                        const next = [...(visualContent.header.socialLinks || [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleVisualChange(p => ({ ...p, header: { ...p.header, socialLinks: next } }));
                      }}
                      className="form-input w-1/2"
                      placeholder={t("header.labelPlaceholder")}
                    />
                    <button
                      onClick={() => {
                        const next = (visualContent.header.socialLinks || []).filter((_, i) => i !== idx);
                        handleVisualChange(p => ({ ...p, header: { ...p.header, socialLinks: next } }));
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={link.url}
                    onChange={(e) => {
                      const next = [...(visualContent.header.socialLinks || [])];
                      next[idx] = { ...next[idx], url: e.target.value };
                      handleVisualChange(p => ({ ...p, header: { ...p.header, socialLinks: next } }));
                    }}
                    className="form-input"
                    placeholder={t("header.urlPlaceholder")}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full border-dashed text-gray-500 hover:text-[var(--editor-primary)]"
                onClick={() => handleVisualChange(p => ({ ...p, header: { ...p.header, socialLinks: [...(p.header.socialLinks || []), { id: Date.now().toString(), network: "", url: "" }] } }))}
              >
                {t("header.addSocialLink")}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "style" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("style.colors")}</label>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { label: t("style.primary"), key: "primaryColor" },
                    { label: t("style.accent"), key: "accentColor" },
                    { label: t("style.text"), key: "textColor" },
                    { label: t("style.background"), key: "pageBackground" },
                  ] as { label: string; key: "primaryColor" | "accentColor" | "textColor" | "pageBackground" }[]
                ).map((c) => (
                  <div key={c.key} className="space-y-2">
                    <span className="text-[11px] font-medium text-gray-500">{c.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={visualContent.theme[c.key]}
                        onChange={(e) => handleVisualChange(p => ({ ...p, theme: { ...p.theme, [c.key]: e.target.value } }))}
                        className="h-10 w-10 cursor-pointer overflow-hidden rounded-lg border-none"
                      />
                      <span className="text-xs font-mono text-gray-400 uppercase">{visualContent.theme[c.key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <Type className="h-4 w-4" /> {t("style.typography")}
              </label>
              <Select
                value={visualContent.theme.fontFamily}
                onChange={(e) => handleVisualChange(p => ({ ...p, theme: { ...p.theme, fontFamily: e.target.value } }))}
                options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-gray-500">{t("style.baseFont", { size: visualContent.theme.baseFontSize })}</span>
                  <input
                    type="range" min={12} max={18}
                    value={visualContent.theme.baseFontSize}
                    onChange={(e) => handleVisualChange(p => ({ ...p, theme: { ...p.theme, baseFontSize: Number(e.target.value) } }))}
                    className="w-full accent-[var(--editor-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-gray-500">{t("style.lineHeight", { value: visualContent.theme.lineHeight })}</span>
                  <input
                    type="range" min={1.3} max={1.9} step={0.05}
                    value={visualContent.theme.lineHeight}
                    onChange={(e) => handleVisualChange(p => ({ ...p, theme: { ...p.theme, lineHeight: Number(e.target.value) } }))}
                    className="w-full accent-[var(--editor-primary)]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("style.template")}</label>
              <ResumeTemplatePicker
                value={visualContent.theme.template}
                onChange={(template) => handleVisualChange(p => ({ ...p, theme: { ...p.theme, template } }))}
              />
            </div>
          </div>
        )}

        {activeTab === "photo" && (
          <div className="space-y-6">
            <div className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${
              showPhoto
                ? "bg-[var(--editor-primary-soft)] border-blue-200"
                : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-bold ${
                  showPhoto ? "text-[var(--editor-primary)]" : "text-gray-700"
                }`}>
                  {t("photo.photoOnResume")}
                </span>
                <span className="text-[11px] text-gray-400">
                  {showPhoto ? t("photo.enabledHint") : t("photo.disabledHint")}
                </span>
              </div>
              <button
                onClick={onTogglePhoto}
                aria-label={showPhoto ? t("photo.disableAria") : t("photo.enableAria")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showPhoto ? "bg-[var(--editor-primary)]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showPhoto ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className={`transition-opacity duration-200 ${
              showPhoto ? "opacity-100" : "opacity-40 pointer-events-none select-none"
            }`}>
              <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-6">
                {visualContent.photoUrl ? (
                  // Plain <img>, not next/image: this preview mirrors CV photos served
                  // straight from the backend's /uploads (often localhost in dev), and
                  // Next's image optimizer refuses to proxy URLs that resolve to a
                  // private/loopback IP (SSRF guard) — see ResumeDocument.tsx for the
                  // same reasoning on the print/export preview.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visualContent.photoUrl} width={96} height={96} className={`h-24 w-24 object-cover shadow-lg ${getPhotoShapeClass(visualContent.photoSettings.shape)}`} alt={t("photo.profileAlt")} />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-200 text-gray-400"><UserCircle2 className="h-12 w-12" /></div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black">
                    <Upload className="h-4 w-4" /> {t("photo.upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhotoUpload(e.target.files[0])} />
                  </label>
                  <button onClick={onUseProfilePhoto} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline">{t("photo.useProfilePhoto")}</button>
                </div>
              </div>

              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-gray-500">{t("photo.size", { size: visualContent.photoSettings.size })}</span>
                  <input
                    type="range" min={72} max={220}
                    value={visualContent.photoSettings.size}
                    onChange={(e) => handleVisualChange(p => ({ ...p, photoSettings: { ...p.photoSettings, size: clampPhotoSize(Number(e.target.value)) } }))}
                    className="w-full accent-[var(--editor-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-gray-500">{t("photo.shape")}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["square", "rounded", "circle"] as PhotoShape[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleVisualChange(p => ({ ...p, photoSettings: { ...p.photoSettings, shape: s } }))}
                        className={`rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider ${visualContent.photoSettings.shape === s ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-400 hover:bg-gray-50"}`}
                      >
                        {t(`photo.shapes.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-gray-500">{t("photo.position")}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["left", "right"] as PhotoPosition[]).map(pos => (
                      <button
                        key={pos}
                        onClick={() => handleVisualChange(p => ({ ...p, photoSettings: { ...p.photoSettings, position: pos } }))}
                        className={`rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider ${visualContent.photoSettings.position === pos ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-400 hover:bg-gray-50"}`}
                      >
                        {t(`photo.positions.${pos}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("sections.order")}</label>
              <div className="space-y-2">
                {visualContent.sections.map((section) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => setDraggingId(section.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(section.id); }}
                    onDrop={() => { onReorderSections(draggingId!, dragOverId!); setDraggingId(null); setDragOverId(null); }}
                    className={`group flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                      activeSectionId === section.id
                        ? "border-blue-200 bg-[var(--editor-primary-soft)] shadow-[0_4px_12px_rgba(37,99,235,0.05)] ring-1 ring-blue-100"
                        : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white hover:shadow-md"
                    } ${draggingId === section.id ? "opacity-30 scale-95" : ""} ${dragOverId === section.id ? "border-blue-400 bg-blue-100/50 scale-[1.02]" : ""}`}
                  >
                    <GripVertical className="h-4 w-4 cursor-grab text-gray-300" />
                    <button onClick={() => setActiveSectionId(section.id)} className="flex-1 text-left text-xs font-bold text-gray-700">{section.title}</button>
                    <div className="flex gap-1">
                      <button onClick={() => onShiftSection(section.id, -1)} className="p-1 text-gray-300 hover:text-gray-600"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onShiftSection(section.id, 1)} className="p-1 text-gray-300 hover:text-gray-600"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onDuplicateSection(section.id)} className="p-1 text-gray-300 hover:text-[var(--editor-primary)]"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onRemoveSection(section.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-gray-400">{t("sections.tip")}</p>
            </div>

            <div className="space-y-4 rounded-2xl bg-[var(--editor-primary-soft)] p-6">
              <label htmlFor="newSectionTitle" className="text-[10px] font-bold uppercase tracking-wider text-[var(--editor-primary)]">{t("sections.addNew")}</label>
              <div className="space-y-3">
                <input
                  id="newSectionTitle"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder={t("sections.titlePlaceholder")}
                  className="form-input"
                />
                <Select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value as SectionType)}
                  options={["custom", "summary", "experience", "education", "skills", "projects", "certifications", "languages", "socialLinks"].map((type) => ({
                    value: type,
                    label: t(`sections.types.${type}`),
                  }))}
                />
                <Button
                  className="w-full bg-[var(--editor-primary)] hover:bg-[var(--editor-primary-hover)] shadow-lg shadow-blue-200"
                  onClick={() => { onAddSection(newSectionTitle, newSectionType); setNewSectionTitle(t("defaultSectionTitle")); }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> {t("sections.addSection")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
