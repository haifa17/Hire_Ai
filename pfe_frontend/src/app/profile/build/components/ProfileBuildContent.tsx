"use client";

import { useSearchParams } from "next/navigation";
import { FullPageSpinner } from "@/components/auth/FullPageSpinner";
import {
  useProfileBuildGate,
  type ProfileBuildMode,
} from "../hooks/useProfileBuildGate";
import { CandidateProfileBuilder } from "./CandidateProfileBuilder";
import { RecruiterProfileSetup } from "./RecruiterProfileSetup";

export function ProfileBuildContent() {
  const mode: ProfileBuildMode =
    useSearchParams().get("mode") === "edit" ? "edit" : "create";
  const gate = useProfileBuildGate(mode);

  if (gate.status === "loading") return <FullPageSpinner />;

  // Keyed by mode so switching between create and edit starts from fresh state.
  if (gate.role === "RECRUITER") {
    return <RecruiterProfileSetup key={mode} mode={mode} />;
  }

  return (
    <CandidateProfileBuilder key={mode} mode={mode} gateError={gate.error} />
  );
}
