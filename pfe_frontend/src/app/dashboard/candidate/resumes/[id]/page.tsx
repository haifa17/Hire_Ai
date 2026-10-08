import { redirect } from "next/navigation";

export default async function CandidateResumeDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/resumes/${id}`);
}
