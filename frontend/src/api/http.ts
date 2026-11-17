import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { tokenStore } from './token-store';
import type { ApiErrorBody } from './types';

export interface FieldIssue {
  location: string;
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation messages keyed by field name (from 422 responses). */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as FieldIssue[]).map((issue) => [issue.path, issue.message]),
    );
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const body = error.response?.data?.error;

    // An expired/invalid session on an authenticated call ends the session.
    if (status === 401 && error.config?.headers?.Authorization) {
      tokenStore.notifyUnauthorized();
    }

    const message =
      body?.message ??
      (error.code === 'ERR_NETWORK' ? 'Cannot reach the chat server' : error.message);
    return Promise.reject(
      new ApiError(message, status, body?.code ?? 'NETWORK_ERROR', body?.details),
    );
  },
);

/** Every endpoint responds with `{ data }`; unwrap it once, here. */
const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await client.request<{ data: T }>(config);
  return response.data.data;
};

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ method: 'GET', url, params }),
  post: <T>(url: string, data?: unknown) => request<T>({ method: 'POST', url, data }),
  patch: <T>(url: string, data?: unknown) => request<T>({ method: 'PATCH', url, data }),
  delete: <T>(url: string, data?: unknown) => request<T>({ method: 'DELETE', url, data }),
};
