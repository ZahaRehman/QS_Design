import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  adminLogin,
  adminLogout,
  adminMe,
  clearSession,
  getStoredSession,
  persistSession,
} from "@/lib/adminAuthApi";

export interface AdminUser {
  email?: string;
  id?: string;
  [key: string]: unknown;
}

export interface AdminSession {
  accessToken: string;
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string;
  user: AdminUser | null;
  session: AdminSession | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const restore = async () => {
      const stored = getStoredSession() as AdminSession | null;
      if (!stored?.accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data = (await adminMe({ accessToken: stored.accessToken })) as { user: AdminUser };
        setSession(stored);
        setUser(data.user);
      } catch {
        clearSession();
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = (await adminLogin({ email, password })) as {
        session: AdminSession;
        user: AdminUser;
      };
      persistSession(data.session);
      setSession(data.session);
      setUser(data.user);
      return { success: true as const };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign in failed";
      return { success: false as const, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session?.accessToken) {
        await adminLogout({ accessToken: session.accessToken });
      }
    } catch {
      /* still clear local session */
    } finally {
      clearSession();
      setSession(null);
      setUser(null);
    }
  }, [session?.accessToken]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: Boolean(session && user),
      isLoading,
      email: typeof user?.email === "string" ? user.email : "",
      user,
      session,
      login,
      logout,
    }),
    [isLoading, user, session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
