"use client";

import { useTranslations } from "next-intl";
import { SettingsView } from "../../_components/SettingsView";

export default function RecruiterSettingsPage() {
  const t = useTranslations("recruiterDashboard.settings");

  return (
    <SettingsView
      profileHref="/dashboard/recruiter/profile"
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        account: {
          title: t("sections.account.title"),
          editProfile: {
            title: t("sections.account.editProfile.title"),
            description: t("sections.account.editProfile.description"),
            action: t("sections.account.editProfile.action"),
          },
          changePassword: {
            title: t("sections.account.changePassword.title"),
            description: t("sections.account.changePassword.description"),
            action: t("sections.account.changePassword.action"),
          },
        },
        notifications: {
          title: t("sections.notifications.title"),
          alerts: {
            title: t("sections.notifications.instantAlerts.title"),
            description: t("sections.notifications.instantAlerts.description"),
            toggleLabel: t("sections.notifications.instantAlerts.toggleAriaLabel"),
          },
          weeklyDigest: {
            title: t("sections.notifications.weeklyDigest.title"),
            description: t("sections.notifications.weeklyDigest.description"),
            toggleLabel: t("sections.notifications.weeklyDigest.toggleAriaLabel"),
          },
        },
        privacy: {
          title: t("sections.privacy.title"),
          visibility: {
            title: t("sections.privacy.companyVisibility.title"),
            description: t("sections.privacy.companyVisibility.description"),
            toggleLabel: t("sections.privacy.companyVisibility.toggleAriaLabel"),
          },
        },
        other: {
          title: t("sections.other.title"),
          description: t("sections.other.description"),
        },
      }}
    />
  );
}
