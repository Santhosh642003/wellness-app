import { createContext, useContext, useState, useEffect } from 'react';
import { api, set401Handler } from '../lib/api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  // admin_user holds non-sensitive profile data (name/email) for display.
  // The auth token lives exclusively in an httpOnly cookie — never in localStorage.
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });

  // Redirect to login on any 401 so session expiry is surfaced immediately,
  // not silently swallowed by per-component .catch(console.error) calls.
  useEffect(() => {
    set401Handler(() => {
      localStorage.removeItem('admin_user');
      setAdmin(null);
    });
  }, []);

  const login = async (email, password) => {
    const { admin: a } = await api.login({ email, password });
    localStorage.setItem('admin_user', JSON.stringify(a));
    setAdmin(a);
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore network errors on logout */ }
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  return <Ctx.Provider value={{ admin, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
