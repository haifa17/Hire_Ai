import { Suspense } from "react";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import { ProfileBuildContent } from "./components/ProfileBuildContent";

// Server component: only the content needs the client (useSearchParams),
// and it must sit under Suspense for static rendering.
export default function ProfileBuilderPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ProfileBuildContent />
    </Suspense>
  );
}
