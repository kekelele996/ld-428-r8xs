import { useAuthStore } from '../stores/authStore';

interface Envelope<T> {
  data: T;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isEnvelope<T>(payload: unknown): payload is Envelope<T> {
  return typeof payload === 'object' && payload !== null && 'data' in payload;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) message = errorBody.message;
    } catch {
      // 忽略非 JSON 错误体
    }
    throw new ApiError(response.status, message);
  }

  const payload = (await response.json()) as T | Envelope<T>;
  return isEnvelope<T>(payload) ? payload.data : payload;
}
