import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "./GoogleIcon";

type GoogleButtonProps = {
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function GoogleButton({ onClick, children, className }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50",
        className,
      )}
    >
      <GoogleIcon className="h-4 w-4" />
      {children}
    </button>
  );
}