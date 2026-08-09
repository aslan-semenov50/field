export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name?: string;
}

export type AuthState =
  | { status: 'checking'; accessToken: null; user: null; error: null }
  | { status: 'anonymous'; accessToken: null; user: null; error: null }
  | { status: 'authenticated'; accessToken: string; user: AuthUser; error: null }
  | { status: 'error'; accessToken: null; user: null; error: string };
