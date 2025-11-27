'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name}!</h1>
      
      {user && !user.isAdmin && (
        <div className="space-y-4">
          <p>Team: {user.team?.name}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Available Quizzes</h2>
            <p className="text-gray-600">Quiz functionality coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}