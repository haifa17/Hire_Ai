"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Lock,
  Shield,
  SlidersHorizontal,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { SettingRow } from "@/components/ui/SettingRow";
import { Switch } from "@/components/ui/Switch";

const SECTION_CLASS =
  "rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm";
const ACTION_LINK_CLASS =
  "inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50";

type RowLabels = { title: string; description: string };
type ActionRowLabels = RowLabels & { action: string };
type ToggleRowLabels = RowLabels & { toggleLabel: string };

export type SettingsLabels = {
  title: string;
  subtitle: string;
  account: {
    title: string;
    editProfile: ActionRowLabels;
    changePassword: ActionRowLabels;
  };
  notifications: {
    title: string;
    alerts: ToggleRowLabels;
    weeklyDigest: ToggleRowLabels;
  };
  privacy: { title: string; visibility: ToggleRowLabels };
  other: RowLabels;
};

type SettingsSectionProps = {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
};

function SettingsSection({ icon: Icon, title, children }: SettingsSectionProps) {
  return (
    <section className={SECTION_CLASS}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </div>
      {children}
    </section>
  );
}

type SettingsViewProps = {
  labels: SettingsLabels;
  /** Where "edit profile" leads for this role. */
  profileHref: string;
};

/** Settings page shared by the candidate and recruiter dashboards. */
export function SettingsView({ labels, profileHref }: SettingsViewProps) {
  // Display-only for now: these preferences are not sent to the backend.
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [visibilityEnabled, setVisibilityEnabled] = useState(true);

  const { account, notifications, privacy, other } = labels;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8">
      <section className={SECTION_CLASS}>
        <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{labels.subtitle}</p>
      </section>

      <SettingsSection icon={UserCircle2} title={account.title}>
        <div className="space-y-3">
          <SettingRow
            title={account.editProfile.title}
            description={account.editProfile.description}
          >
            <Link href={profileHref} className={ACTION_LINK_CLASS}>
              {account.editProfile.action}
            </Link>
          </SettingRow>

          <SettingRow
            title={account.changePassword.title}
            description={account.changePassword.description}
          >
            <Link href="/change-password" className={ACTION_LINK_CLASS}>
              <Lock className="h-3.5 w-3.5" />
              {account.changePassword.action}
            </Link>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} title={notifications.title}>
        <div className="space-y-3">
          <SettingRow
            title={notifications.alerts.title}
            description={notifications.alerts.description}
          >
            <Switch
              label={notifications.alerts.toggleLabel}
              checked={alertsEnabled}
              onChange={setAlertsEnabled}
            />
          </SettingRow>

          <SettingRow
            title={notifications.weeklyDigest.title}
            description={notifications.weeklyDigest.description}
          >
            <Switch
              label={notifications.weeklyDigest.toggleLabel}
              checked={weeklyDigestEnabled}
              onChange={setWeeklyDigestEnabled}
            />
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection icon={Shield} title={privacy.title}>
        <SettingRow
          title={privacy.visibility.title}
          description={privacy.visibility.description}
        >
          <Switch
            label={privacy.visibility.toggleLabel}
            checked={visibilityEnabled}
            onChange={setVisibilityEnabled}
          />
        </SettingRow>
      </SettingsSection>

      <section className={SECTION_CLASS}>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          {other.title}
        </div>
        <p className="mt-2 text-sm text-gray-500">{other.description}</p>
      </section>
    </div>
  );
}
