"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useResumeStore } from "@/store/useResumeStore";
import { PlusCircle, FileText, Trash2, Edit2, Loader2, Sparkles } from "lucide-react";

export default function ResumesPage() {
  const t = useTranslations("resumesEditor.list");
  const { resumes, fetchResumes, deleteResume, loading } = useResumeStore();

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteResume(id);
    }
  };

  if (loading && resumes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/resumes/enhance"
            className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-sm hover:shadow transition"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t("enhanceButton")}
          </Link>
          <Link
            href="/dashboard/resumes/create"
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {t("generateButton")}
          </Link>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-12 mt-8 border border-dashed border-gray-200 dark:border-gray-700">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("empty.title")}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
            {t("empty.description")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/resumes/enhance"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t("empty.enhanceButton")}
            </Link>
            <Link
              href="/dashboard/resumes/create"
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              {t("empty.createButton")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3
                    className="font-semibold text-lg text-gray-900 dark:text-white truncate"
                    title={resume.title}
                  >
                    {resume.title}
                  </h3>
                  <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {t("card.language", { language: resume.language })}
                  </span>
                  <span
                    className={`inline-flex mt-2 ml-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      typeof resume.atsScore?.overall === "number"
                        ? resume.atsScore.overall >= 70
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : resume.atsScore.overall >= 50
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {typeof resume.atsScore?.overall === "number"
                      ? t("card.atsScore", { score: resume.atsScore.overall })
                      : t("card.atsPending")}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(resume.id)}
                  className="text-gray-400 hover:text-red-500 transition ml-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 mt-auto pt-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                <span>
                  {new Date(resume.createdAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" />
                  {t("card.viewAndEdit")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
