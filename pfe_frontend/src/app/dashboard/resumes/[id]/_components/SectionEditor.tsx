import React from "react";
import { useTranslations } from "next-intl";
import { ResumeSection } from "@/domain/models/Resume";
import { ExperienceEditor } from "@/components/experience";
import { EducationEditor } from "@/components/education";
import { ProjectEditor } from "@/components/project";
import { CertificationEditor } from "@/components/certification";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { splitSkillItem, formatSkillItem, splitLanguageItem, formatLanguageItemString } from "../_utils/resume-helpers";

interface SectionEditorProps {
  activeSection: ResumeSection | null;
  newItemText: string;
  newSkillLevel: string;
  onSetNewItemText: (value: string) => void;
  onSetNewSkillLevel: (value: string) => void;
  onAddSectionItem: () => void;
  onRemoveSectionItem: (sectionId: string, index: number) => void;
  onUpdateSectionItem: (sectionId: string, index: number, value: string) => void;
  onMoveSectionItem: (sectionId: string, index: number, direction: -1 | 1) => void;
  onApplyExperienceItems: (sectionId: string, items: string[]) => void;
  onUpdateSectionContent: (sectionId: string, content: string) => void;
  onUpdateSectionTitle: (sectionId: string, title: string) => void;
}

export function SectionEditor(props: SectionEditorProps) {
  const {
    activeSection, newItemText, newSkillLevel, onSetNewItemText, onSetNewSkillLevel,
    onAddSectionItem, onRemoveSectionItem, onUpdateSectionItem, onMoveSectionItem,
    onApplyExperienceItems, onUpdateSectionContent, onUpdateSectionTitle
  } = props;

  const t = useTranslations("resumesEditor.sectionEditor");
  const SKILL_LEVEL_LABELS = [
    t("skillLevels.beginner"),
    t("skillLevels.intermediate"),
    t("skillLevels.advanced"),
    t("skillLevels.expert"),
  ];
  const LANGUAGE_LEVEL_LABELS = [
    t("languageLevels.native"),
    t("languageLevels.fluent"),
    t("languageLevels.advanced"),
    t("languageLevels.intermediate"),
    t("languageLevels.basic"),
  ];

  if (!activeSection) return null;

  const renderSpecificEditor = () => {
    switch (activeSection.type) {
      case "experience":
        return <ExperienceEditor items={activeSection.items} onItemsChange={(items) => onApplyExperienceItems(activeSection.id, items)} />;
      case "education":
        return <EducationEditor items={activeSection.items} onItemsChange={(items) => onApplyExperienceItems(activeSection.id, items)} />;
      case "projects":
        return <ProjectEditor items={activeSection.items} onItemsChange={(items) => onApplyExperienceItems(activeSection.id, items)} />;
      case "certifications":
        return <CertificationEditor items={activeSection.items} onItemsChange={(items) => onApplyExperienceItems(activeSection.id, items)} />;
      case "skills":
      case "languages":
        const isLanguages = activeSection.type === "languages";
        const title = isLanguages ? t("languagesTitle") : t("skillsTitle");
        const levelLabels = isLanguages ? LANGUAGE_LEVEL_LABELS : SKILL_LEVEL_LABELS;
        const splitFn = isLanguages ? splitLanguageItem : splitSkillItem;
        const formatFn = isLanguages ? formatLanguageItemString : formatSkillItem;
        const namePlaceholder = isLanguages ? t("languageNamePlaceholder") : t("skillNamePlaceholder");

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {activeSection.items.map((item, index) => {
                const parsedItem = splitFn(item);
                return (
                  <div key={`${activeSection.id}-${index}`} className="group relative rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm">
                    <div className="flex flex-col gap-3">
                      <input
                        value={parsedItem.name}
                        onChange={(e) => onUpdateSectionItem(activeSection.id, index, formatFn(e.target.value, parsedItem.level))}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none"
                        placeholder={namePlaceholder}
                      />
                      <div className="flex items-center justify-between">
                        <select
                          value={parsedItem.level}
                          onChange={(e) => onUpdateSectionItem(activeSection.id, index, formatFn(parsedItem.name, e.target.value))}
                          className="form-select w-auto"
                        >
                          <option value="">{t("noLevel")}</option>
                          {levelLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => onMoveSectionItem(activeSection.id, index, -1)} className="p-1.5 text-gray-400 hover:text-blue-600"><ArrowUp className="h-4 w-4" /></button>
                          <button onClick={() => onMoveSectionItem(activeSection.id, index, 1)} className="p-1.5 text-gray-400 hover:text-blue-600"><ArrowDown className="h-4 w-4" /></button>
                          <button onClick={() => onRemoveSectionItem(activeSection.id, index)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
              <input
                value={newItemText}
                onChange={(e) => onSetNewItemText(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none"
                placeholder={t("addItemPlaceholder", { title: title.toLowerCase() })}
              />
              <div className="mt-3 flex items-center justify-between">
                <select
                  value={newSkillLevel}
                  onChange={(e) => onSetNewSkillLevel(e.target.value)}
                  className="form-select w-auto"
                >
                  {levelLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button onClick={onAddSectionItem} className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-black">{t("add")}</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">{t("contentLabel")}</label>
              <textarea
                value={activeSection.content}
                onChange={(e) => onUpdateSectionContent(activeSection.id, e.target.value)}
                rows={5}
                className="form-textarea"
                placeholder={t("writeSomething")}
              />
            </div>
            <div className="space-y-2">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">{t("bulletPoints")}</label>
               {activeSection.items.map((item, index) => (
                 <div key={index} className="flex items-center gap-2">
                   <input
                     value={item}
                     onChange={(e) => onUpdateSectionItem(activeSection.id, index, e.target.value)}
                     className="form-input flex-1"
                   />
                   <button onClick={() => onRemoveSectionItem(activeSection.id, index)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                 </div>
               ))}
               <div className="flex gap-2">
                 <input
                   value={newItemText}
                   onChange={(e) => onSetNewItemText(e.target.value)}
                   className="form-input flex-1"
                   placeholder={t("addBulletPlaceholder")}
                 />
                 <button onClick={onAddSectionItem} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black">{t("add")}</button>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">{t("sectionTitleLabel")}</label>
        <input
          value={activeSection.title}
          onChange={(e) => onUpdateSectionTitle(activeSection.id, e.target.value)}
          className="form-input"
        />
      </div>
      {renderSpecificEditor()}
    </div>
  );
}
