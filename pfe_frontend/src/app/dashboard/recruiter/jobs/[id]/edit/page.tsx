"use client";

import { useTranslations } from "next-intl";
import { JobEditView } from "../../../../_components/JobEditView";

export default function EditRecruiterJobPage() {
  const t = useTranslations("recruiterDashboard.jobEdit");

  return (
    <JobEditView
      redirectTo="/dashboard/recruiter/jobs"
      labels={{
        loading: t("loading"),
        notFound: t("notFound"),
        title: t("title"),
        subtitle: t("subtitle"),
      }}
    />
  );
}
