"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  FileText,
  Briefcase,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import type {
  AdminAlert,
  AdminMonthlySignupPoint,
  AdminOverviewStats,
} from "@/domain/models/AdminStats";

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
}: Readonly<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  trend?: string;
}>) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="rounded-lg p-2.5 bg-blue-50">
          <Icon className="h-5 w-5 text-blue-500" />
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.startsWith("-")
                ? "text-red-600 bg-red-50"
                : "text-green-600 bg-green-50"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{subtext}</p>
    </div>
  );
}

function BarChart({
  data,
}: Readonly<{ data: { month: string; value: number }[] }>) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2 h-52 pt-4">
      {data.map((bar, index) => (
        <div
          key={`${bar.month}-${index}`}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <div
            className="w-full flex items-end justify-center"
            style={{ height: "180px" }}
          >
            <div
              className="w-full rounded-t-md bg-blue-200 hover:bg-blue-400 transition-colors cursor-pointer"
              style={{ height: `${(bar.value / max) * 100}%` }}
              title={`${bar.month}: ${bar.value}`}
            />
          </div>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            {bar.month}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTrend(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const t = useTranslations("adminDashboard.overview");

  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [signups, setSignups] = useState<AdminMonthlySignupPoint[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [overview, signupPoints, recentAlerts] = await Promise.all([
          adminService.getOverviewStats(),
          adminService.getMonthlySignups(6),
          adminService.getRecentAlerts(5),
        ]);
        if (cancelled) return;
        setStats(overview);
        setSignups(signupPoints);
        setAlerts(recentAlerts);
      } catch {
        if (!cancelled) setError(t("error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-400 text-sm">
        {t("loading")}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-red-500 text-sm">
        {error ?? t("error")}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t("stats.totalUsers.label")}
          value={formatNumber(stats.totalUsers)}
          subtext={t("stats.totalUsers.subtext", {
            candidates: formatNumber(stats.usersByRole.candidates),
            recruiters: formatNumber(stats.usersByRole.recruiters),
          })}
          trend={formatTrend(stats.userGrowthPct)}
        />
        <StatCard
          icon={TrendingUp}
          label={t("stats.totalApplications.label")}
          value={formatNumber(stats.totalApplications)}
          subtext={t("stats.totalApplications.subtext", {
            count: formatNumber(stats.applicationsThisMonth),
          })}
          trend={formatTrend(stats.applicationGrowthPct)}
        />
        <StatCard
          icon={FileText}
          label={t("stats.aiCvsGenerated.label")}
          value={formatNumber(stats.totalResumes)}
          subtext={t("stats.aiCvsGenerated.subtext", {
            count: formatNumber(stats.totalResumes),
          })}
        />
        <StatCard
          icon={Briefcase}
          label={t("stats.activeJobPosts.label")}
          value={formatNumber(stats.activeJobPosts)}
          subtext={t("stats.activeJobPosts.subtext", {
            count: formatNumber(stats.totalJobOffers),
          })}
        />
      </div>

      {/* ── Platform Growth + Snapshot ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-1">
            <h2 className="text-base font-bold text-gray-900">
              {t("platformGrowth.title")}
            </h2>
            <p className="text-xs text-gray-400">
              {t("platformGrowth.subtitle")}
            </p>
          </div>
          <BarChart
            data={signups.map((point) => ({
              month: point.label,
              value: point.value,
            }))}
          />
        </div>

        {/* Platform snapshot */}
        <div className="rounded-xl bg-blue-600 p-5 text-white shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold">{t("aiInsights.title")}</span>
          </div>

          {/* Pending reports */}
          <div className="rounded-xl bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest text-blue-200 uppercase">
                {t("aiInsights.pendingReports.label")}
              </p>
              <span
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  stats.pendingReports > 0
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full inline-block ${
                    stats.pendingReports > 0 ? "bg-yellow-400" : "bg-green-400"
                  }`}
                ></span>{" "}
                {stats.pendingReports > 0
                  ? t("aiInsights.pendingReports.needsAttention")
                  : t("aiInsights.pendingReports.clear")}
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(stats.pendingReports)}
            </p>
            <p className="mt-1.5 text-[11px] text-blue-200">
              {t("aiInsights.pendingReports.description", {
                count: stats.pendingReports,
              })}
            </p>
          </div>

          {/* Applications this month */}
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-[11px] font-semibold tracking-widest text-blue-200 uppercase">
              {t("aiInsights.applications.label")}
            </p>
            <p className="mt-1.5 text-xs text-blue-100 leading-relaxed">
              {t("aiInsights.applications.description", {
                count: formatNumber(stats.applicationsThisMonth),
              })}
            </p>
          </div>

          <Link
            href="/dashboard/admin/reports"
            className="mt-auto w-full text-center rounded-xl border border-white/30 bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            {t("aiInsights.viewFullMetrics")}
          </Link>
        </div>
      </div>

      {/* ── Recent System Alerts ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t("alerts.title")}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("alerts.subtitle")}
            </p>
          </div>
          <Link
            href="/dashboard/admin/reports"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            {t("alerts.viewAll")}
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            {t("alerts.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("alerts.table.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("alerts.table.details")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("alerts.table.type")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("alerts.table.time")}
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("alerts.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700">
                        <Clock className="h-3 w-3" />
                        {t("alerts.status.Pending")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-400">{alert.subtitle}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-gray-400" />
                        {alert.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                      {timeAgo(alert.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/dashboard/admin/reports"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        {t("alerts.action")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
