import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import { disconnectSocket } from '../socket/socket';

export function useAuth() {
  const { accessToken, user, setAuth, clear } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      setAuth(res.accessToken, res.user);
      return res.user;
    },
    [setAuth]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.register(email, password, name);
      setAuth(res.accessToken, res.user);
      return res.user;
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    disconnectSocket();
    clear();
  }, [clear]);

  return { isAuthenticated: !!accessToken, user, login, register, logout };
}
