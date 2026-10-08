import axios from "axios";
import api from "@/lib/api";
import { getApiErrorMessage as resolveApiErrorMessage } from "@/lib/api-error";
import { User } from "@/domain/models/User";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: User & { isEmailVerified: boolean };
  tokens: AuthTokens;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: "CANDIDATE" | "RECRUITER";
}

export interface GoogleAuthOptions {
  flow: "signin" | "signup";
  role?: "CANDIDATE" | "RECRUITER";
}

// ─── Error helper ─────────────────────────────────────────────────────────────

/**
 * User-facing message for an API error. Kept here for existing imports; the
 * logic lives in lib/api-error.ts.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  return resolveApiErrorMessage(err, fallback);
}

// ─── Auth service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Build the backend Google OAuth URL and include the intended flow.
   */
  getGoogleAuthUrl(options: GoogleAuthOptions): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const url = new URL("/api/v1/auth/google", baseUrl);

    url.searchParams.set("flow", options.flow);
    if (options.role) {
      url.searchParams.set("role", options.role);
    }

    return url.toString();
  },

  /**
   * Register a new user.
   * Returns the success message from the backend.
   * The user must verify their email before they can log in.
   */
  async register(payload: RegisterPayload): Promise<string> {
    const { data } = await api.post<{ message: string }>(
      "/auth/register",
      payload,
    );
    return data.message;
  },

  /**
   * Verify a user's email address using the token received by email.
   * Returns the success message from the backend.
   */
  async verifyEmail(token: string): Promise<string> {
    const { data } = await api.post<{ message: string }>("/auth/verify-email", {
      token,
    });
    return data.message;
  },

  /**
   * Authenticate with email + password.
   * Returns the authenticated user and a pair of JWT tokens.
   */
  async login(
    email: string,
    password: string,
    options: { keepLoggedIn?: boolean } = {},
  ): Promise<LoginResponse> {
    const { data } = await api.post("/auth/login", {
      email,
      password,
      rememberMe: options.keepLoggedIn ?? false,
    });
    // The backend wraps the payload in `data.data` via ResponseInterceptor
    return data.data as LoginResponse;
  },

  /**
   * Exchange the Google OAuth refresh cookie for an access token.
   */
  async refreshAccessToken(): Promise<string> {
    const { data } = await axios.post<{ data: { accessToken: string } }>(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );

    return data.data.accessToken;
  },

  /**
   * Load the authenticated user profile after a token is available.
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<{ data: User }>("/users/me");
    return data.data;
  },

  /**
   * Invalidate the current session on the backend.
   * The caller is responsible for clearing local state afterwards.
   */
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  /**
   * Request a password-reset email for the given address.
   */
  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<{ message: string }>(
      "/auth/forgot-password",
      { email },
    );
    return data.message;
  },

  /**
   * Set a new password using the one-time token received by email.
   */
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const { data } = await api.post<{ message: string }>(
      "/auth/reset-password",
      { token, newPassword },
    );
    return data.message;
  },

  /**
   * Change the current user's password.
   * Requires the current password and a new password.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<string> {
    const { data } = await api.post<{ message: string }>(
      "/auth/change-password",
      { currentPassword, newPassword },
    );
    return data.message;
  },
};
