export interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  salaryRange?: string;
  description: string;
  requirements: string[];
  postedAt: string;
  matchScore?: number;
}
