'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { services } from './api';
import type { User } from './types';

type Context = {
  user: User | null;
  loading: boolean;
  valuesVisible: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setValuesVisible: (value: boolean) => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<Context | null>(null);
const tokenKey = 'financial-control:token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [valuesVisible, setValuesVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem(tokenKey);

    if (!token) {
      setLoading(false);
      return;
    }

    services
      .me()
      .then(({ user }) => mounted && setUser(user))
      .catch(() => localStorage.removeItem(tokenKey))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await services.login({ email, password });
    localStorage.setItem(tokenKey, result.token);
    setUser(result.user);
    setValuesVisible(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setUser(null);
    setValuesVisible(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, valuesVisible, login, logout, setValuesVisible, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
