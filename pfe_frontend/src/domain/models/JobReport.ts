export type ReportType =
  | "FRAUD"
  | "INCORRECT_INFO"
  | "SPAM"
  | "EXPIRED"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";

export type ReportStatus = "PENDING" | "RESOLVED";

export interface JobReportUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface JobReportJobOffer {
  id: string;
  title: string;
  slug: string;
  status?: string;
  deletedAt?: string | null;
  company?: {
    name: string;
  };
}

export interface JobReport {
  id: string;
  jobOfferId: string;
  userId: string;
  reason: string;
  type: ReportType;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  jobOffer: JobReportJobOffer;
  user: JobReportUser;
}

export interface CreateJobReportDto {
  jobOfferId: string;
  type: ReportType;
  reason: string;
}

export interface QueryJobReportsDto {
  type?: ReportType;
  status?: ReportStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface JobReportListResponse {
  items: JobReport[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
