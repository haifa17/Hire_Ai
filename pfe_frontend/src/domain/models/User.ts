export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN";
  isEmailVerified?: boolean;
  avatarUrl?: string;
  photoUrl?: string;
  professionalTitle?: string;
  phone?: string;
  address?: string;
}
