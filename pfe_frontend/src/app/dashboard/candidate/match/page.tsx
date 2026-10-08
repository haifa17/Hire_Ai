import { Suspense } from "react";
import { OfferMatchContent } from "./_components/OfferMatchContent";

// The content reads `?jobId=` (useSearchParams), so it must sit under Suspense.
export default function OfferMatchPage() {
  return (
    <Suspense fallback={null}>
      <OfferMatchContent />
    </Suspense>
  );
}
