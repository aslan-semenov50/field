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
import { ApiError, apiRequest, authApi, type AuthorizedRequest } from './api';
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
  authorizedRequest: AuthorizedRequest;
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
  const accessTokenRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<string> | null>(null);

  const clearSession = useCallback((expectedAccessToken?: string) => {
    if (expectedAccessToken && accessTokenRef.current !== expectedAccessToken) return;

    operationIdRef.current += 1;
    accessTokenRef.current = null;
    bootstrapInFlight = null;
    setState(anonymousState);
  }, []);

  const retrySession = useCallback(async () => {
    const operationId = ++operationIdRef.current;
    accessTokenRef.current = null;
    setState(checkingState);

    try {
      const session = await getBootstrapSession();
      if (operationIdRef.current !== operationId) return;

      if (session) {
        accessTokenRef.current = session.accessToken;
        setState({
          status: 'authenticated',
          accessToken: session.accessToken,
          user: session.user,
          error: null,
        });
      } else {
        accessTokenRef.current = null;
        setState(anonymousState);
      }
    } catch (error) {
      if (operationIdRef.current !== operationId) return;
      accessTokenRef.current = null;
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
      accessTokenRef.current = null;
    };
  }, [retrySession]);

  const authenticate = useCallback(
    async (request: () => Promise<{ accessToken: string }>) => {
      const operationId = ++operationIdRef.current;
      const { accessToken } = await request();
      const user = await authApi.me(accessToken);

      if (operationIdRef.current !== operationId) return;
      bootstrapInFlight = null;
      accessTokenRef.current = accessToken;
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

  const refreshAccessToken = useCallback((): Promise<string> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const previousAccessToken = accessTokenRef.current;
    if (!previousAccessToken) {
      return Promise.reject(new ApiError(401, 'Authentication is required'));
    }

    const operationId = operationIdRef.current;
    const refreshRequest = (async () => {
      try {
        const { accessToken } = await authApi.refresh();
        if (operationIdRef.current !== operationId) {
          throw new ApiError(401, 'Authentication state changed');
        }

        accessTokenRef.current = accessToken;
        setState((current) =>
          current.status === 'authenticated' ? { ...current, accessToken } : current,
        );
        return accessToken;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession(previousAccessToken);
        }
        throw error;
      }
    })();

    const trackedRequest = refreshRequest.finally(() => {
      if (refreshInFlightRef.current === trackedRequest) {
        refreshInFlightRef.current = null;
      }
    });
    refreshInFlightRef.current = trackedRequest;
    return trackedRequest;
  }, [clearSession]);

  const authorizedRequest = useCallback<AuthorizedRequest>(
    async <T,>(path: string, init: RequestInit = {}) => {
      const requestAccessToken = accessTokenRef.current;
      if (!requestAccessToken) {
        throw new ApiError(401, 'Authentication is required');
      }

      try {
        return await apiRequest<T>(path, { ...init, accessToken: requestAccessToken });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }

      const currentAccessToken = accessTokenRef.current;
      const retryAccessToken =
        currentAccessToken && currentAccessToken !== requestAccessToken
          ? currentAccessToken
          : await refreshAccessToken();

      try {
        return await apiRequest<T>(path, { ...init, accessToken: retryAccessToken });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession(retryAccessToken);
        }
        throw error;
      }
    },
    [clearSession, refreshAccessToken],
  );

  const logout = useCallback(async () => {
    const pendingRefresh = refreshInFlightRef.current;
    const previousAccessToken = accessTokenRef.current;
    const operationId = ++operationIdRef.current;
    accessTokenRef.current = null;

    try {
      if (pendingRefresh) {
        try {
          await pendingRefresh;
        } catch {
          // Logout still clears whichever refresh cookie remains after the pending request.
        }
      }
      await authApi.logout();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        if (operationIdRef.current === operationId) {
          accessTokenRef.current = previousAccessToken;
        }
        throw error;
      }
    }

    if (operationIdRef.current !== operationId) return;
    bootstrapInFlight = null;
    accessTokenRef.current = null;
    setState(anonymousState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, register, logout, retrySession, authorizedRequest }),
    [state, login, register, logout, retrySession, authorizedRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
