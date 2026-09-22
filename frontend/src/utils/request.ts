const TOKEN_KEY = 'art-gallery-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      (body as { message?: string | string[] } | null)?.message instanceof Array
        ? (body as { message: string[] }).message.join('；')
        : ((body as { message?: string } | null)?.message ?? `Request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}
