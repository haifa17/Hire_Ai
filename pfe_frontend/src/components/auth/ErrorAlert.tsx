import { cn } from "@/lib/utils";

type ErrorAlertProps = { message: string | null; className?: string };

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",
        className,
      )}
    >
      {message}
    </div>
  );
}