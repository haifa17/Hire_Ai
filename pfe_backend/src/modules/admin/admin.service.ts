import { Injectable } from '@nestjs/common';
import { Role, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      usersByRole,
      newUsersThisMonth,
      newUsersPrevMonth,
      activeJobPosts,
      totalJobOffers,
      aiCvsGenerated,
      totalResumes,
      totalApplications,
      applicationsThisMonth,
      applicationsPrevMonth,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      }),
      this.prisma.jobOffer.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.jobOffer.count(),
      this.prisma.candidate_resumes.count({ where: { source: 'AI' } }),
      this.prisma.resume.count(),
      this.prisma.application.count(),
      this.prisma.application.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.application.count({
        where: {
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      }),
      this.prisma.jobReport.count({ where: { status: 'PENDING' } }),
    ]);

    const roleCounts = usersByRole.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.role] = row._count._all;
        return acc;
      },
      {},
    );

    return {
      totalUsers,
      usersByRole: {
        candidates: roleCounts[Role.CANDIDATE] ?? 0,
        recruiters: roleCounts[Role.RECRUITER] ?? 0,
        admins: roleCounts[Role.ADMIN] ?? 0,
      },
      newUsersThisMonth,
      userGrowthPct: this.pctChange(newUsersPrevMonth, newUsersThisMonth),
      activeJobPosts,
      totalJobOffers,
      aiCvsGenerated,
      totalResumes,
      totalApplications,
      applicationsThisMonth,
      applicationGrowthPct: this.pctChange(
        applicationsPrevMonth,
        applicationsThisMonth,
      ),
      pendingReports,
    };
  }

  async getApplicationStatusBreakdown() {
    const rows = await this.prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const breakdown = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return Object.values(ApplicationStatus).reduce<Record<string, number>>(
      (acc, status) => {
        acc[status] = breakdown[status] ?? 0;
        return acc;
      },
      {},
    );
  }

  async getRecentAlerts(limit = 5) {
    const reports = await this.prisma.jobReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        jobOffer: { select: { title: true } },
      },
    });

    return reports.map((report) => ({
      id: report.id,
      type: report.type,
      title: `Job report: ${report.type}`,
      subtitle: report.jobOffer?.title ?? 'Unknown job offer',
      createdAt: report.createdAt,
    }));
  }

  async getMonthlySignups(months = 6) {
    const now = new Date();
    const buckets: { label: string; start: Date; end: Date }[] = [];

    for (let i = months - 1; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        label: start.toLocaleString('en-US', { month: 'short' }),
        start,
        end,
      });
    }

    const counts = await Promise.all(
      buckets.map(({ start, end }) =>
        this.prisma.user.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ),
    );

    return buckets.map((bucket, index) => ({
      label: bucket.label,
      value: counts[index],
    }));
  }

  private pctChange(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
}
