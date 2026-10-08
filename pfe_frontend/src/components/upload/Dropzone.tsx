"use client";

import React, { useCallback, useRef, useState } from "react";

interface DropzoneProps {
  accept?: string;
  maxSizeBytes?: number;
  onFile: (file: File) => void;
}

export function Dropzone({
  accept = "application/pdf",
  maxSizeBytes = 10 * 1024 * 1024,
  onFile,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (file.size > maxSizeBytes) {
        alert("File too large (max 10MB).");
        return;
      }
      if (accept && !file.type.includes(accept.split("/")[0])) {
        // simple mime check
      }
      onFile(file);
    },
    [onFile, accept, maxSizeBytes],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsActive(true);
        }}
        onDragLeave={() => setIsActive(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition ${
          isActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <div>
          <p className="text-sm font-medium text-gray-900">
            Drag & drop your CV here
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF only · Max 10MB · Click to select
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export default Dropzone;
