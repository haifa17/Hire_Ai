import {
  BarChart2,
  Briefcase,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  Target,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { User as AppUser } from "@/domain/models/User";

export type NavItem = {
  /** Key under `dashboardShell.nav`. */
  nameKey: string;
  href: string;
  icon: LucideIcon;
};

const CANDIDATE_NAV: NavItem[] = [
  { nameKey: "candidate.dashboard", href: "/dashboard/candidate", icon: LayoutDashboard },
  { nameKey: "candidate.myProfile", href: "/dashboard/candidate/profile", icon: User },
  { nameKey: "candidate.myResumes", href: "/dashboard/resumes", icon: FileText },
  { nameKey: "candidate.myInterviews", href: "/dashboard/candidate/interviews", icon: CalendarDays },
  { nameKey: "candidate.jobSearch", href: "/dashboard/candidate/jobs", icon: Search },
  { nameKey: "candidate.matchOffer", href: "/dashboard/candidate/match", icon: Target },
  { nameKey: "candidate.aiRecommendations", href: "/dashboard/candidate/recommendations", icon: TrendingUp },
  { nameKey: "candidate.myApplications", href: "/dashboard/candidate/applications", icon: Briefcase },
  { nameKey: "candidate.settings", href: "/dashboard/candidate/settings", icon: Settings },
];

const RECRUITER_NAV: NavItem[] = [
  { nameKey: "recruiter.dashboard", href: "/dashboard/recruiter", icon: LayoutDashboard },
  { nameKey: "recruiter.myProfile", href: "/dashboard/recruiter/profile", icon: User },
  { nameKey: "recruiter.myJobs", href: "/dashboard/recruiter/jobs", icon: Briefcase },
  { nameKey: "recruiter.interviews", href: "/dashboard/recruiter/interviews", icon: CalendarDays },
  { nameKey: "recruiter.analytics", href: "#", icon: BarChart2 },
  { nameKey: "recruiter.settings", href: "/dashboard/recruiter/settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { nameKey: "admin.dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
  { nameKey: "admin.myProfile", href: "/dashboard/admin/profile", icon: User },
  { nameKey: "admin.userManagement", href: "/dashboard/admin/users", icon: Users },
  { nameKey: "admin.jobListings", href: "/dashboard/admin/jobs", icon: Briefcase },
  { nameKey: "admin.reportManagement", href: "/dashboard/admin/reports", icon: ShieldAlert },
];

export function getNavigation(role?: AppUser["role"]): NavItem[] {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "RECRUITER") return RECRUITER_NAV;
  return CANDIDATE_NAV;
}

/** Key under `dashboardShell` for the subtitle shown under the user's name. */
export function getUserTitleKey(role?: AppUser["role"]) {
  if (role === "ADMIN") return "userTitle.headAdministrator" as const;
  if (role === "RECRUITER") return "userTitle.recruiter" as const;
  return "userTitle.candidate" as const;
}
