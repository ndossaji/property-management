/**
 * Simple Authentication Utilities
 * Helper functions and types for JWT-based authentication
 */

export interface User {
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface AuthError {
  message: string;
  detail?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * Get the API URL from environment variables
 */
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

/**
 * Format error for display
 */
export const formatAuthError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.detail) return error.detail;
  if (error?.message) return error.message;
  return 'An authentication error occurred';
};

/**
 * Get user initials for avatar
 */
export const getUserInitials = (user: User | null): string => {
  if (!user) return '?';
  
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  
  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }
  
  return '?';
};

/**
 * Store auth token in localStorage
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

/**
 * Get auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

/**
 * Remove auth token from localStorage
 */
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};

/**
 * Store user in localStorage
 */
export const setUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

/**
 * Get user from localStorage
 */
export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
};

