import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/me').then(d => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('auth-expired', h);
    return () => window.removeEventListener('auth-expired', h);
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token); setUser(d.user); return d.user;
  }, []);
  const register = useCallback(async (name, email, password) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    setToken(d.token); setUser(d.user); return d.user;
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return <Ctx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
