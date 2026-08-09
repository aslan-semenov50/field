import type { AuthUser, LoginInput, RegisterInput } from './types';

interface AccessTokenResponse {
  accessToken: string;
}

interface LogoutResponse {
  success: boolean;
}

const apiUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function extractMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value.map(extractMessage).filter((message): message is string => Boolean(message));
    return messages.length ? messages.join('. ') : null;
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return extractMessage((value as { message?: unknown }).message);
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(payload) || `FIELD API returned ${response.status}`,
      payload,
    );
  }

  return payload as T;
}

export const authApi = {
  register(input: RegisterInput) {
    return request<AccessTokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login(input: LoginInput) {
    return request<AccessTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  refresh() {
    return request<AccessTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  logout() {
    return request<LogoutResponse>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  me(accessToken: string) {
    return request<AuthUser>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
