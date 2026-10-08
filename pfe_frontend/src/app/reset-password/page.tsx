import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ResetPasswordContent } from "./components/ResetPasswordContent";

// Server component: only the content needs the client (useSearchParams),
// and it must sit under Suspense for static rendering.
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <Loader2
            className="h-8 w-8 animate-spin text-blue-600"
            aria-hidden="true"
          />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}