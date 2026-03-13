import { createContext, useContext, useState } from 'react';
import { api } from '../lib/api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });

  const login = async (email, password) => {
    const { token, admin: a } = await api.login({ email, password });
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(a));
    setAdmin(a);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  return <Ctx.Provider value={{ admin, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
