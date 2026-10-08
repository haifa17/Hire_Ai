import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/domain/models/User";
import { useProfileStore } from "@/store/useProfileStore";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** Called after a successful login — stores user + access token. */
  setAuth: (user: User, accessToken: string) => void;
  /** Update authenticated user details without touching tokens. */
  updateUser: (user: User) => void;
  /** Called by the token-refresh interceptor to rotate access tokens silently. */
  setTokens: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      updateUser: (user) => set((state) => ({ ...state, user })),
      setTokens: (accessToken) => set({ accessToken }),
      logout: () => {
        // Clear persisted profile state to avoid leaking previous user's data.
        useProfileStore.getState().resetProfile();
        useProfileStore.persist.clearStorage();

        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
      // Guard against SSR (localStorage is browser-only)
      storage: createJSONStorage(() =>
        globalThis.window
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
