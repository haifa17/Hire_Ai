"use client";

import { useTranslations } from "next-intl";
import { SettingsView } from "../../_components/SettingsView";

export default function CandidateSettingsPage() {
  const t = useTranslations("candidateDashboard.settings");

  return (
    <SettingsView
      profileHref="/profile/build?mode=edit"
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        account: {
          title: t("account"),
          editProfile: {
            title: t("editProfile"),
            description: t("editProfileHint"),
            action: t("goToProfile"),
          },
          changePassword: {
            title: t("changePassword"),
            description: t("changePasswordHint"),
            action: t("changePassword"),
          },
        },
        notifications: {
          title: t("notifications"),
          alerts: {
            title: t("jobAlerts"),
            description: t("jobAlertsHint"),
            toggleLabel: t("toggleJobAlerts"),
          },
          weeklyDigest: {
            title: t("weeklyDigest"),
            description: t("weeklyDigestHint"),
            toggleLabel: t("toggleWeeklyDigest"),
          },
        },
        privacy: {
          title: t("privacy"),
          visibility: {
            title: t("publicProfileVisibility"),
            description: t("publicProfileVisibilityHint"),
            toggleLabel: t("toggleProfileVisibility"),
          },
        },
        other: {
          title: t("otherSettings"),
          description: t("otherSettingsHint"),
        },
      }}
    />
  );
}
