import React from 'react';
import { useAuthStore } from '../store/authStore';

function Dashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to your Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Hello, {user?.email}! This is your personal dashboard where you can manage your account and view your activities.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dashboard cards/widgets can be added here */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Quick Stats</h2>
              <p className="text-blue-600">Your account statistics and metrics will appear here.</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-900 mb-2">Recent Activity</h2>
              <p className="text-green-600">Your recent activities will be displayed here.</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-900 mb-2">Notifications</h2>
              <p className="text-purple-600">Your latest notifications will show up here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;