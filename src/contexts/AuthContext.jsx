import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth as authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from token
  useEffect(() => {
    const token = localStorage.getItem('wellness_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('wellness_token');
        localStorage.removeItem('wellness_logged_in');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await authApi.login({ email, password });
    localStorage.setItem('wellness_token', token);
    localStorage.setItem('wellness_logged_in', 'true');
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: u } = await authApi.register(data);
    localStorage.setItem('wellness_token', token);
    localStorage.setItem('wellness_logged_in', 'true');
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wellness_token');
    localStorage.removeItem('wellness_logged_in');
    setUser(null);
  }, []);

  const isLoggedIn = !!user || localStorage.getItem('wellness_logged_in') === 'true';

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
