import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-3xl font-semibold text-gray-700">Page Not Found</h2>
        <p className="mt-2 text-lg text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <HomeIcon className="h-5 w-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;