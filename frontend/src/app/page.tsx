/**
 * Home Page Component
 * Landing page with links to login and API documentation
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Property Management Application
        </h1>
        
        <div className="mb-8 text-center">
          <p className="text-lg mb-4">
            Welcome to your Property Management System
          </p>
          <p className="text-sm text-gray-600">
            Docker deployment is configured and running!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Frontend</h2>
            <p className="text-sm text-gray-600">
              Next.js 14 with TypeScript, Tailwind CSS, and React Query
            </p>
          </div>

          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Backend</h2>
            <p className="text-sm text-gray-600">
              FastAPI with Python, PostgreSQL, and Celery
            </p>
          </div>

          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Authentication</h2>
            <p className="text-sm text-gray-600">
              Auth0 integration for secure multi-tenant access
            </p>
          </div>

          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Storage</h2>
            <p className="text-sm text-gray-600">
              AWS S3 for documents, receipts, and file uploads
            </p>
          </div>
        </div>

        <div className="mt-8 text-center space-x-4">
          {isLoading ? (
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Sign In
            </Link>
          )}
          <a
            href="/api/docs"
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            API Documentation
          </a>
          <a
            href="/api/health"
            className="inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Health Check
          </a>
        </div>
      </div>
    </main>
  );
}

