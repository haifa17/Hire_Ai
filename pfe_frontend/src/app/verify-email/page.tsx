import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyEmailContent } from "./components/Verifyemailcontent";

// Server component: only the content needs the client (useSearchParams),
// and it must sit under Suspense for static rendering.
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" aria-hidden="true" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}