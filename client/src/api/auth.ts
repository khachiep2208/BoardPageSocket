import axios from 'axios';
import { api, API_URL } from './axios';
import type { AuthUser } from '../store/authStore';

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await api.post('/auth/register', { email, password, name });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** Bootstrap phiên đăng nhập khi load app: dùng refresh cookie để lấy access token. */
export async function bootstrapSession(): Promise<AuthResponse | null> {
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    return res.data;
  } catch {
    return null;
  }
}
