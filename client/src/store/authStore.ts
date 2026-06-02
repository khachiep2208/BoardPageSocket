import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  // Access token giữ TRONG BỘ NHỚ (không localStorage) — refresh token nằm ở httpOnly cookie.
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, user: null }),
}));

// Truy cập ngoài React (axios interceptor, socket auth).
export const getAccessToken = () => useAuthStore.getState().accessToken;
