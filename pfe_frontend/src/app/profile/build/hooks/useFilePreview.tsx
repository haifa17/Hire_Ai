import { useEffect, useMemo } from "react";

/**
 * Object URL for a locally picked file, revoked when the file changes or the
 * component unmounts. Returns null while no file is selected.
 */
export function useFilePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
