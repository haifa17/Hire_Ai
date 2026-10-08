import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_WIDTH = { md: "max-w-md", lg: "max-w-lg" } as const;

type AuthShellProps = {
  children: ReactNode;
  /** Extra classes for the card (padding, alignment). */
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
  /** Show the decorative background circle. */
  decorated?: boolean;
};

/** Shared full-screen layout for standalone auth pages. */
export function AuthShell({
  children,
  className = "py-12",
  maxWidth = "md",
  decorated = true,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "relative flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12",
        decorated && "overflow-hidden",
      )}
    >
      {decorated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-40 h-130 w-130 rounded-full bg-blue-100/60"
        />
      )}
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl bg-white px-10 shadow-lg",
          MAX_WIDTH[maxWidth],
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}