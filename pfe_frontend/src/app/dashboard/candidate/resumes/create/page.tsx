import { redirect } from "next/navigation";

export default function CandidateCreateResumeRedirectPage() {
  redirect("/dashboard/resumes/create");
}
