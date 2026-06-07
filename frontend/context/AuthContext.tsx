'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('cc_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.getMe();
      if (response.success) {
        setUser(response.data);
      }
    } catch {
      localStorage.removeItem('cc_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success) {
      localStorage.setItem('cc_token', response.data.token);
      setUser(response.data.user as unknown as User);
    }
  };

  const register = async (data: RegisterData) => {
    const response: any = await api.register(data);
    if (response.success) {
      localStorage.setItem('cc_token', response.data.token);
      setUser(response.data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('cc_token');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
