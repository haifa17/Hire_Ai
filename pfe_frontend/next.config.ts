import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Emits .next/standalone: a self-contained server bundling only the
  // node_modules actually reached at runtime. Used by the Docker production
  // image to keep it small. Harmless outside Docker — `next dev` and
  // `next start` behave exactly as before.
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      // Deliberately NOT adding a localhost:3000/127.0.0.1 pattern here: even
      // with a matching remotePattern, Next's image optimizer refuses to proxy
      // any URL that resolves to a private/loopback IP (SSRF guard, not
      // configurable). The backend's /uploads/* is always local in dev, so
      // those images are rendered with a plain <img> instead of next/image
      // (see EditorSidebar.tsx / ResumeDocument.tsx) rather than fighting that
      // guard here.
    ],
  },
};

export default withNextIntl(nextConfig);