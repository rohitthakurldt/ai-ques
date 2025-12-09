'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '@/types';
import { loginUser } from '@/lib/authApi';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check if user is logged in from localStorage
    if (typeof window === 'undefined') return null;
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('access_token');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        return null;
      }
    }
    if (storedToken) {
      return {
        id: 'token-user',
        email: 'user',
        name: 'User',
      };
    }
    return null;
  });

  const login = async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const newUser: User = {
      id: 'token-user',
      email,
      name: email.split('@')[0],
    };

    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (result.token) {
      localStorage.setItem('access_token', result.token);
    }

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

