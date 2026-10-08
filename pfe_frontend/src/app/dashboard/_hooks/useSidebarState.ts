import { useState } from "react";

const COLLAPSED_STORAGE_KEY = "dashboard_sidebar_collapsed";
const DESKTOP_MIN_WIDTH = 1024; // Tailwind `lg`

function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Sidebar state: `isOpen` is the mobile drawer, `isCollapsed` the desktop
 * icon-only mode (remembered in localStorage).
 *
 * Only call from a component rendered after hydration, since the collapsed
 * flag is read from localStorage on first render.
 */
export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  /** The top-bar menu button: opens the drawer on mobile, collapses on desktop. */
  const toggleFromMenuButton = () => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) {
      setIsOpen((prev) => !prev);
      return;
    }
    toggleCollapsed();
  };

  return {
    isOpen,
    close: () => setIsOpen(false),
    isCollapsed,
    toggleCollapsed,
    toggleFromMenuButton,
  };
}
