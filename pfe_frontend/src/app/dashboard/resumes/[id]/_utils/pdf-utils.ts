/* ─────────────────────────────────────────────────────────────────────────────
   pdf-utils.ts — PDF / print export helpers
   ───────────────────────────────────────────────────────────────────────────── */

export const COLOR_STYLE_KEYS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "columnRuleColor",
  "caretColor",
] as const;

export const UNSUPPORTED_COLOR_FN_PATTERN = /\b(?:oklab|oklch|lab|lch)\s*\(/i;

// ─────────────────────────────────────────────────────────────────────────────
// Color normalisation (for canvas compat)
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeCssColorToRgb(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent") return value;
  if (!UNSUPPORTED_COLOR_FN_PATTERN.test(trimmed)) return value;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) return "rgb(0,0,0)";

    context.fillStyle = "#000";
    context.fillStyle = trimmed;
    const resolved = context.fillStyle;

    if (UNSUPPORTED_COLOR_FN_PATTERN.test(resolved)) return "rgb(0,0,0)";
    return resolved || "rgb(0,0,0)";
  } catch {
    return "rgb(0,0,0)";
  }
}

export function sanitizeUnsupportedColorsForCanvas(root: HTMLElement): void {
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  elements.forEach((el) => {
    const computed = globalThis.getComputedStyle(el);
    COLOR_STYLE_KEYS.forEach((key) => {
      const rawValue = computed[key];
      if (UNSUPPORTED_COLOR_FN_PATTERN.test(rawValue)) {
        el.style[key] = normalizeCssColorToRgb(rawValue);
      }
    });
    if (UNSUPPORTED_COLOR_FN_PATTERN.test(computed.boxShadow)) el.style.boxShadow = "none";
    if (UNSUPPORTED_COLOR_FN_PATTERN.test(computed.textShadow)) el.style.textShadow = "none";
  });
}

export function stripUnsupportedColorFunctionsFromInlineStyles(root: HTMLElement): void {
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  elements.forEach((el) => {
    const style = el.style;
    Array.from(style).forEach((prop) => {
      const rawValue = style.getPropertyValue(prop);
      if (!UNSUPPORTED_COLOR_FN_PATTERN.test(rawValue)) return;
      if (prop.toLowerCase().includes("color")) {
        style.setProperty(prop, normalizeCssColorToRgb(rawValue));
      } else {
        style.removeProperty(prop);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline computed styles (for canvas cloning)
// ─────────────────────────────────────────────────────────────────────────────

export function inlineComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computed = globalThis.getComputedStyle(source);
  Array.from(computed).forEach((property) => {
    target.style.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property),
    );
  });
}

export function inlineComputedStylesTree(sourceRoot: HTMLElement, targetRoot: HTMLElement): void {
  inlineComputedStyles(sourceRoot, targetRoot);
  const sourceChildren = Array.from(sourceRoot.children);
  const targetChildren = Array.from(targetRoot.children);
  const count = Math.min(sourceChildren.length, targetChildren.length);
  for (let i = 0; i < count; i++) {
    const sc = sourceChildren[i];
    const tc = targetChildren[i];
    if (sc instanceof HTMLElement && tc instanceof HTMLElement) {
      inlineComputedStylesTree(sc, tc);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image helpers
// ─────────────────────────────────────────────────────────────────────────────

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function waitForImageElement(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (image.complete) { resolve(); return; }
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

export function waitForImagesInElement(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(images.map(waitForImageElement)).then(() => undefined);
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  const originalDataUrl = await fileToDataUrl(file);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 900;
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(originalDataUrl); return; }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82) || originalDataUrl);
    };
    image.onerror = () => resolve(originalDataUrl);
    image.src = originalDataUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert any <img src="..."> inside a node to data-URLs so a detached window
// can render them without cross-origin issues.
// ─────────────────────────────────────────────────────────────────────────────

async function resolveImagesToDataUrls(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const resp = await fetch(img.src, { mode: "cors" });
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch {
        // Keep original src if fetch fails (will still render if same-origin)
      }
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collect all <style> and <link rel="stylesheet"> from the current document so
// fonts and global utilities are preserved in the print window.
// ─────────────────────────────────────────────────────────────────────────────

function collectPageStyles(): string {
  const parts: string[] = [];

  // Inline <style> tags
  document.querySelectorAll("style").forEach((s) => {
    parts.push(`<style>${s.innerHTML}</style>`);
  });

  // External <link rel="stylesheet"> — convert to @import so the print window
  // can load them. Google Fonts and similar are fine since they're cross-origin allowed.
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    if (l.href) parts.push(`<link rel="stylesheet" href="${l.href}" />`);
  });

  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY EXPORT: Print-window PDF
//
// Opens an invisible window containing only the CV article, adds print CSS,
// and calls window.print(). The browser renders text as real vectors — the
// resulting PDF has selectable text, crisp fonts, and a small file size.
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCvAsPrintPdf(
  sourceEl: HTMLElement,
  filename: string,
): Promise<void> {
  // 1. Deep-clone the CV node
  const clone = sourceEl.cloneNode(true) as HTMLElement;

  // 2. Strip UI-only decorators (page break guide, no-print markers)
  clone.querySelector(".page-break-guide")?.remove();
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());

  // 3. Resolve images to data-URLs so they survive cross-window rendering
  await resolveImagesToDataUrls(clone);

  // 4. Reset any transform/scale the preview wrapper applied
  clone.style.transform = "none";
  clone.style.boxShadow = "none";
  clone.style.margin = "0";
  clone.style.padding = clone.style.padding || "52px 60px";

  // 5. Collect styles from the current page (Tailwind, fonts, custom CSS)
  const pageStyles = collectPageStyles();

  // 6. Build the print HTML document
  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${filename}</title>
  ${pageStyles}
  <style>
    /* ── Reset ────────────────────────────────────── */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      width: 210mm !important;
    }

    /* ── Page setup ──────────────────────────────── */
    @page {
      size: A4 portrait;
      margin: 0mm;
    }

    /* ── CV article ─────────────────────────────── */
    article {
      width: 210mm !important;
      min-height: 297mm !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      page-break-inside: avoid;
    }

    /* ── Avoid breaking inside sections ─────────── */
    section, li, p {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ── Hide any lingering UI decorations ──────── */
    .no-print, .page-break-guide { display: none !important; }

    /* ── Print trigger spinner overlay ──────────── */
    #__print_overlay {
      display: none;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
  <script>
    window.addEventListener('load', function () {
      // Small delay so fonts / images finish loading
      setTimeout(function () {
        window.focus();
        window.print();
        // Close the print window after the dialog is dismissed
        window.addEventListener('afterprint', function () {
          window.close();
        });
      }, 600);
    });
  </script>
</body>
</html>`;

  // 7. Open the print window
  const printWindow = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
  if (!printWindow) {
    throw new Error(
      "Le navigateur a bloqué l'ouverture de la fenêtre d'impression. Autorisez les popups pour ce site.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
