"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Check, X, ArrowRight, FileCheck, Layers, Tag } from "lucide-react";

interface OptimizeCvModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onApply: () => void;
  readonly addedKeywords: string[];
  readonly modifiedSections: string[];
  readonly summaryOfChanges: string;
}

export function OptimizeCvModal({
  isOpen,
  onClose,
  onApply,
  addedKeywords,
  modifiedSections,
  summaryOfChanges,
}: OptimizeCvModalProps) {
  const t = useTranslations("resumesEditor.optimizeCvModal");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t("title")}
              </h3>
              <p className="text-xs text-slate-300">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Summary of Changes */}
          {summaryOfChanges && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                <FileCheck className="h-4 w-4" />
                {t("overviewLabel")}
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {summaryOfChanges}
              </p>
            </div>
          )}

          {/* Integrated Keywords */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <Tag className="h-4 w-4 text-emerald-600" />
              {t("integratedKeywords", { count: addedKeywords.length })}
            </div>
            {addedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {addedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t("keywordsBlended")}
              </p>
            )}
          </div>

          {/* Modified Sections */}
          {modifiedSections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                <Layers className="h-4 w-4 text-indigo-600" />
                {t("enhancedSections")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {modifiedSections.map((sec) => (
                  <div
                    key={sec}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    {sec}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800">
            {t.rich("noteText", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onApply}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            {t("applyButton")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
