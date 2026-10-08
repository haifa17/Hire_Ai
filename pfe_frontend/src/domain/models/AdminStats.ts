export interface AdminOverviewStats {
  totalUsers: number;
  usersByRole: {
    candidates: number;
    recruiters: number;
    admins: number;
  };
  newUsersThisMonth: number;
  userGrowthPct: number;
  activeJobPosts: number;
  totalJobOffers: number;
  aiCvsGenerated: number;
  totalResumes: number;
  totalApplications: number;
  applicationsThisMonth: number;
  applicationGrowthPct: number;
  pendingReports: number;
}

export interface AdminMonthlySignupPoint {
  label: string;
  value: number;
}

export interface AdminAlert {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
}

export type AdminApplicationStatusBreakdown = Record<string, number>;
