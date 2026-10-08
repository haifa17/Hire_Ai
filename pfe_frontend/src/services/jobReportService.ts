import api from "@/lib/api";
import type {
  CreateJobReportDto,
  JobReport,
  JobReportListResponse,
  QueryJobReportsDto,
} from "@/domain/models/JobReport";

function extractData<T>(payload: unknown): T {
  const asEnvelope = payload as { data?: T };
  return (asEnvelope?.data as T) ?? (payload as T);
}

export const jobReportService = {
  async createReport(dto: CreateJobReportDto): Promise<JobReport> {
    const response = await api.post("/job-reports", dto);
    return extractData<JobReport>(response.data);
  },

  async checkUserReport(jobOfferId: string): Promise<{ hasReported: boolean }> {
    const response = await api.get(`/job-reports/check/${jobOfferId}`);
    return extractData<{ hasReported: boolean }>(response.data);
  },

  async listAdminReports(
    query: QueryJobReportsDto = {}
  ): Promise<JobReportListResponse> {
    const response = await api.get("/job-reports/admin", { params: query });
    return extractData<JobReportListResponse>(response.data);
  },

  async resolveReport(reportId: string): Promise<JobReport> {
    const response = await api.patch(`/job-reports/admin/${reportId}/resolve`);
    return extractData<JobReport>(response.data);
  },

  async deleteJobOffer(jobOfferId: string): Promise<{ message: string; jobOfferId: string }> {
    const response = await api.delete(`/job-reports/admin/jobs/${jobOfferId}`);
    return extractData<{ message: string; jobOfferId: string }>(response.data);
  },
};
