export type InterviewType = "VIDEO" | "ONSITE" | "PHONE";

export type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export interface Interview {
  id: string;
  title: string;
  interviewType: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  duration: number;
  message?: string | null;
  sendInvitation: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  recruiterId: string;
  candidateId: string;
  jobOfferId: string;
  recruiter?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  candidate?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  jobOffer?: {
    id: string;
    title?: string | null;
    city?: string | null;
    country?: string | null;
  };
}

export interface CreateInterviewPayload {
  title: string;
  interviewType: InterviewType;
  scheduledAt: string;
  duration: number;
  message?: string;
  sendInvitation?: boolean;
  notes?: string;
  candidateId: string;
  jobOfferId: string;
}

export interface UpdateInterviewPayload {
  title?: string;
  interviewType?: InterviewType;
  scheduledAt?: string;
  duration?: number;
  message?: string;
  sendInvitation?: boolean;
  notes?: string;
  status?: InterviewStatus;
}

export interface AvailabilityBusySlot {
  id: string;
  title: string;
  status: InterviewStatus;
  startsAt: string;
  endsAt: string;
}

export interface RecruiterAvailability {
  recruiterId: string;
  from: string;
  to: string;
  busySlots: AvailabilityBusySlot[];
}
