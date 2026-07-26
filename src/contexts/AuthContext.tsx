import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  AUTH_EXPIRED_EVENT,
  clearTokens,
  getRefreshToken,
  hasRefreshToken,
  setTokens,
} from "@/lib/auth-storage";
import type { AuthResponse, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresIn,
    );
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (hasRefreshToken() || getRefreshToken()) {
        await api.logout();
      }
    } catch {
      // Ignore logout errors and clear local session anyway.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const onExpired = () => {
      console.log("[auth] session expired — clearing user");
      clearTokens();
      setUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!hasRefreshToken()) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("[auth] restoring session");
        const profile = await api.me();
        if (!cancelled) {
          setUser(profile);
          console.log("[auth] session restored:", profile.username);
        }
      } catch (error) {
        console.warn("[auth] session restore failed:", error);
        clearTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      clearTokens();
      const response = await api.login(username, password);
      applyAuthResponse(response);
      console.log("[auth] logged in:", response.user.username);
    },
    [applyAuthResponse],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
