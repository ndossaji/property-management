'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login, error, clearError } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">Property Management</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 border border-red-200 dark:border-red-700">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !username || !password}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">Demo Credentials</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4 rounded-md">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong className="text-gray-900 dark:text-gray-100">Admin Account:</strong>
                </p>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                  Username: <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-mono text-xs border border-indigo-200 dark:border-indigo-600">admin</code>
                </p>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                  Password: <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-mono text-xs border border-indigo-200 dark:border-indigo-600">admin123</code>
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 rounded-md">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong className="text-gray-900 dark:text-gray-100">Demo Account:</strong>
                </p>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                  Username: <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-green-600 dark:text-green-400 font-mono text-xs border border-green-200 dark:border-green-600">demo</code>
                </p>
                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                  Password: <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-green-600 dark:text-green-400 font-mono text-xs border border-green-200 dark:border-green-600">demo123</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
