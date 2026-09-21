import { createContext, useContext, useState, type ReactNode } from 'react';
import { authPost, getToken, setToken, clearToken } from '../api/client';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Reads the signed-in user out of the stored JWT.
 *
 * This is presentation only. The payload is base64, not a proof of anything --
 * anyone can hand-craft one. Every route that matters is checked server-side
 * against the signature, so the worst a forged payload achieves is a misleading
 * name in the sidebar and API calls that come back 401.
 */
function readUserFromToken(token: string | null): User | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    const claims = JSON.parse(json);

    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null;
    if (typeof claims.id !== 'number' || !claims.role) return null;

    return { id: claims.id, name: claims.name, email: claims.email, role: claims.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Resolved synchronously from storage, so there is no signed-out flash and no
  // bootstrap request on load.
  const [user, setUser] = useState<User | null>(() => {
    const existing = readUserFromToken(getToken());
    if (!existing) clearToken();
    return existing;
  });

  const login = async (email: string, password: string) => {
    const res = await authPost('/login', { email, password });
    setToken(res.token);
    const u: User = { id: res.id, name: res.name, email: res.email, role: res.role };
    setUser(u);
    return u;
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await authPost('/signup', { name, email, password });
    setToken(res.token);
    const u: User = { id: res.id, name: res.name, email: res.email, role: res.role };
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await authPost('/logout');
    } catch {
      /* nothing to tear down server-side; the token is the session */
    }
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
