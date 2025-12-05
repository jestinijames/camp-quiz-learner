'use client';

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
    <div className="text-center px-2">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        Welcome, {user.name}! 👋
      </h1>
      <p className="text-sm sm:text-base text-gray-600">
        Team: <span className="font-semibold wrap-break-word">{user.team?.name}</span>
      </p>
    </div>
  );
}