import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, authApi } from './api';
import type { AuthState, AuthUser, LoginInput, RegisterInput } from './types';

interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  state: AuthState;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => Promise<void>;
}

const checkingState: AuthState = {
  status: 'checking',
  accessToken: null,
  user: null,
  error: null,
};

const anonymousState: AuthState = {
  status: 'anonymous',
  accessToken: null,
  user: null,
  error: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

let bootstrapInFlight: Promise<AuthSession | null> | null = null;

async function restoreSession(): Promise<AuthSession | null> {
  let accessToken: string;

  try {
    const response = await authApi.refresh();
    accessToken = response.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }

  try {
    const user = await authApi.me(accessToken);
    return { accessToken, user };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

function getBootstrapSession() {
  if (!bootstrapInFlight) {
    const request = restoreSession().finally(() => {
      if (bootstrapInFlight === request) bootstrapInFlight = null;
    });
    bootstrapInFlight = request;
  }

  return bootstrapInFlight;
}

function readableError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось связаться с FIELD API. Проверьте, что backend запущен.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(checkingState);
  const operationIdRef = useRef(0);

  const retrySession = useCallback(async () => {
    const operationId = ++operationIdRef.current;
    setState(checkingState);

    try {
      const session = await getBootstrapSession();
      if (operationIdRef.current !== operationId) return;

      setState(
        session
          ? { status: 'authenticated', accessToken: session.accessToken, user: session.user, error: null }
          : anonymousState,
      );
    } catch (error) {
      if (operationIdRef.current !== operationId) return;
      setState({
        status: 'error',
        accessToken: null,
        user: null,
        error: readableError(error),
      });
    }
  }, []);

  useEffect(() => {
    void retrySession();
    return () => {
      operationIdRef.current += 1;
    };
  }, [retrySession]);

  const authenticate = useCallback(
    async (request: () => Promise<{ accessToken: string }>) => {
      const operationId = ++operationIdRef.current;
      const { accessToken } = await request();
      const user = await authApi.me(accessToken);

      if (operationIdRef.current !== operationId) return;
      bootstrapInFlight = null;
      setState({ status: 'authenticated', accessToken, user, error: null });
    },
    [],
  );

  const login = useCallback(
    (input: LoginInput) => authenticate(() => authApi.login(input)),
    [authenticate],
  );

  const register = useCallback(
    (input: RegisterInput) => authenticate(() => authApi.register(input)),
    [authenticate],
  );

  const logout = useCallback(async () => {
    const operationId = ++operationIdRef.current;

    try {
      await authApi.logout();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }

    if (operationIdRef.current !== operationId) return;
    bootstrapInFlight = null;
    setState(anonymousState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, register, logout, retrySession }),
    [state, login, register, logout, retrySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
