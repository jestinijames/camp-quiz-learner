'use client';

import { Users } from 'lucide-react';

type User = {
  name: string;
  team?: {
    name: string;
  };
};

interface WelcomeSectionProps {
  user: User;
}

export function WelcomeSection({ user }: WelcomeSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome, {user.name}! 👋
      </h1>
      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
        <Users className="w-4 h-4" />
        <span className="font-medium text-gray-900 dark:text-white">{user.team?.name}</span>
      </div>
    </div>
  );
}