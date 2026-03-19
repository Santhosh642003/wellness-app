import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth as authApi, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

// Keys to clear from localStorage when user logs in fresh
const STALE_KEYS = [
  'wellness_dashboard_state_v1',
  'wl_dashboard',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register 401 handler so api.js can trigger logout on expired tokens
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStaleData();
      setUser(null);
    });
  }, []);

  // Restore session from token on mount
  useEffect(() => {
    const token = localStorage.getItem('wellness_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('wellness_token');
        localStorage.removeItem('wellness_logged_in');
      })
      .finally(() => setLoading(false));
  }, []);

  const clearStaleData = () => {
    STALE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
  };

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await authApi.login({ email, password });
    localStorage.setItem('wellness_token', token);
    localStorage.setItem('wellness_logged_in', 'true');
    clearStaleData(); // wipe demo data so fresh API data loads
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: u } = await authApi.register(data);
    localStorage.setItem('wellness_token', token);
    localStorage.setItem('wellness_logged_in', 'true');
    clearStaleData();
    setUser(u);
    return u;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const { token, user: u } = await authApi.google(credential);
    localStorage.setItem('wellness_token', token);
    localStorage.setItem('wellness_logged_in', 'true');
    clearStaleData();
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wellness_token');
    localStorage.removeItem('wellness_logged_in');
    clearStaleData();
    setUser(null);
  }, []);

  const isLoggedIn = !!user || localStorage.getItem('wellness_logged_in') === 'true';

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
