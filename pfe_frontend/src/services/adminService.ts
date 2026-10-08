import api from "@/lib/api";
import type {
  AdminAlert,
  AdminApplicationStatusBreakdown,
  AdminMonthlySignupPoint,
  AdminOverviewStats,
} from "@/domain/models/AdminStats";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

export const adminService = {
  async getOverviewStats(): Promise<AdminOverviewStats> {
    const response = await api.get("/admin/stats/overview");
    return extractData<AdminOverviewStats>(response.data);
  },

  async getApplicationStatusBreakdown(): Promise<AdminApplicationStatusBreakdown> {
    const response = await api.get("/admin/stats/applications");
    return extractData<AdminApplicationStatusBreakdown>(response.data);
  },

  async getMonthlySignups(months = 6): Promise<AdminMonthlySignupPoint[]> {
    const response = await api.get("/admin/stats/signups", {
      params: { months },
    });
    return extractData<AdminMonthlySignupPoint[]>(response.data);
  },

  async getRecentAlerts(limit = 5): Promise<AdminAlert[]> {
    const response = await api.get("/admin/alerts", { params: { limit } });
    return extractData<AdminAlert[]>(response.data);
  },
};
