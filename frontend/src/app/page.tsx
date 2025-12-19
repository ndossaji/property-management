/**
 * Home Page Component
 * This is a sample/starter file to demonstrate the Docker setup.
 */

export default function Home() {
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

        <div className="mt-8 text-center">
          <a
            href="/api/docs"
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
          >
            API Documentation
          </a>
          <a
            href="/api/health"
            className="inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Health Check
          </a>
        </div>
      </div>
    </main>
  );
}

