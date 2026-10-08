"use client";

import { useTranslations } from "next-intl";
import { JobEditView } from "../../../../_components/JobEditView";

export default function EditAdminJobPage() {
  const t = useTranslations("adminDashboard.jobEdit");

  return (
    <JobEditView
      redirectTo="/dashboard/admin/jobs"
      labels={{
        loading: t("loading"),
        notFound: t("notFound"),
        title: t("title"),
        subtitle: t("subtitle"),
      }}
    />
  );
}
