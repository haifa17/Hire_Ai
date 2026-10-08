"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock, Shield } from "lucide-react";
import { SettingRow } from "@/components/ui/SettingRow";
import { Switch } from "@/components/ui/Switch";
import { FormSection } from "./form-controls";

export function RecruiterSecuritySection() {
  const t = useTranslations("profileBuilder.recruiterSetup");

  // Display-only for now: these preferences are not sent to the backend.
  const [instantAlertsEnabled, setInstantAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);

  return (
    <FormSection icon={Shield} title={t("sections.accountSecurity")}>
      <div className="space-y-4">
        <SettingRow
          title={t("security.passwordTitle")}
          description={t("security.passwordHint")}
        >
          <Link
            href="/change-password"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("security.changePassword")}
          </Link>
        </SettingRow>

        <SettingRow
          title={t("security.applicantAlertsTitle")}
          description={t("security.applicantAlertsHint")}
        >
          <Switch
            label={t("security.toggleApplicantAlerts")}
            checked={instantAlertsEnabled}
            onChange={setInstantAlertsEnabled}
          />
        </SettingRow>

        <SettingRow
          title={t("security.weeklyDigestTitle")}
          description={t("security.weeklyDigestHint")}
        >
          <Switch
            label={t("security.toggleWeeklyDigest")}
            checked={weeklyDigestEnabled}
            onChange={setWeeklyDigestEnabled}
          />
        </SettingRow>
      </div>
    </FormSection>
  );
}
