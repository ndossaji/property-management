/**
 * Simple Authentication Hook
 * Provides authentication state and methods
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LoginResponse,
  getApiUrl,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUser,
  setUser,
  formatAuthError,
} from '@/lib/auth';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getAuthToken();
      const savedUser = getUser();

      if (token && savedUser) {
        // Verify token is still valid
        try {
          const response = await fetch(`${getApiUrl()}/api/auth/verify`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setUserState(savedUser);
          } else {
            // Token invalid, clear auth
            removeAuthToken();
          }
        } catch (err) {
          console.error('Error verifying token:', err);
          removeAuthToken();
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      
      // Store token
      setAuthToken(data.access_token);

      // Get user info
      const userResponse = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData: User = await userResponse.json();
      
      // Store user
      setUser(userData);
      setUserState(userData);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(formatAuthError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUserState(null);
    router.push('/');
  };

  const clearError = () => {
    setError(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}

