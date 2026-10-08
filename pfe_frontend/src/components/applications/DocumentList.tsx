import React from "react";
import { ExternalLink, FileText, Download } from "lucide-react";
import { resolveUploadUrl } from "@/lib/utils";

type Doc = Readonly<{ id: string; name: string; url?: string; size?: string }>;

export default function DocumentList({ docs }: Readonly<{ docs: Doc[] }>) {
  if (!docs || docs.length === 0) {
    return (
      <div className="text-sm text-slate-500">No documents submitted.</div>
    );
  }

  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-white p-2 shadow-sm">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{d.name}</div>
              {d.size && <div className="text-xs text-slate-500">{d.size}</div>}
            </div>
          </div>

          <div>
            {d.url ? (
              <div className="flex items-center gap-2">
                <a
                  href={resolveUploadUrl(d.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  View
                </a>
                <a
                  href={resolveUploadUrl(d.url)}
                  download
                  className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Unavailable</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
