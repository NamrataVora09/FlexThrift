'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: number;
  name: string;
  email: string;
  user_type: string;
  role: string;
  is_blocked: string | number;
  reliability_score: number;
  referral_code?: string;
  blocked_buyer?: number;
  blocked_seller?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: string) => Promise<{ success: boolean; message?: string }>;
}

interface RegisterData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  address: string;
  pin_code: string;
  user_type: string;
  user_latitude?: string;
  user_longitude?: string;
  referral_code?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('flex_token');
      const savedUser = localStorage.getItem('flex_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('flex_token');
      localStorage.removeItem('flex_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = useCallback((userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('flex_token', authToken);
    localStorage.setItem('flex_user', JSON.stringify(userData));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
    if (res.success && res.data) {
      setAuth(res.data.user, res.data.token);
      return { success: true };
    }
    return { success: false, message: res.message };
  }, [setAuth]);

  const sendOtp = useCallback(async (email: string) => {
    const res = await api.post('/auth/send-otp', { email });
    return { success: res.success, message: res.message };
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/verify-otp', { email, otp });
    if (res.success && res.data) {
      setAuth(res.data.user, res.data.token);
      return { success: true };
    }
    return { success: false, message: res.message };
  }, [setAuth]);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    return { success: res.success, message: res.message };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('flex_token');
    localStorage.removeItem('flex_user');
  }, []);

  const switchRole = useCallback(async (role: string) => {
    const res = await api.post<{ user: User }>(`/auth/switch-role/${role}`);
    if (res.success && res.data) {
      setUser(res.data.user);
      localStorage.setItem('flex_user', JSON.stringify(res.data.user));
      return { success: true };
    }
    return { success: false, message: res.message };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        sendOtp,
        verifyOtp,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
