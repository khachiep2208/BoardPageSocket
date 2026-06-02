import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore, getAccessToken } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // gửi refresh cookie cho /auth/refresh
});

// ── Request: gắn access token ───────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: refresh token khi 401 (gộp nhiều request đồng thời) ────────────
let isRefreshing = false;
// Hàng đợi các request bị 401 trong lúc đang refresh — chỉ refresh 1 lần.
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

/** Gọi /auth/refresh bằng instance axios "trần" để không lặp interceptor. */
async function requestRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    const token = res.data.accessToken as string;
    useAuthStore.getState().setToken(token);
    return token;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Không phải 401, hoặc đã retry rồi, hoặc chính request refresh → bỏ qua.
    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Nếu đang refresh → xếp hàng đợi token mới rồi retry.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    const token = await requestRefresh();
    isRefreshing = false;
    flushQueue(token);

    if (!token) return Promise.reject(error);
    original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
    return api(original);
  }
);
