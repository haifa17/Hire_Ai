import type { ReactNode } from "react";

type SettingRowProps = {
  title: string;
  description: string;
  children: ReactNode; // the control on the right (link, switch…)
};

/** One labelled setting: title and description on the left, its control on the right. */
export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
