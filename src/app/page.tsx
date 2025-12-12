/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Import our new components
import { WelcomeSection } from '../components/WelcomeSection';
import { TeamScoreboard } from '../components/TeamScoreboard';
import { DailyGamesSection } from '@/components/DailyGamesSection';
import { AvailableQuizzes } from '../components/AvailableQuizzes';
import { PersonalTrivia } from '@/components/PersonalTrivia';



export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Welcome, Admin!</h1>
          <Button
            onClick={() => router.push('/admin/dashboard')}
            size="lg"
            className="w-full sm:w-auto"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 max-w-4xl">
      {/* Welcome Section */}
      <WelcomeSection user={{ ...user, team: user.team ?? undefined }} />

      {/* Team Scoreboard */}
      <TeamScoreboard user={{ ...user, team: user.team ?? undefined }} />

      {/* Daily Bible Wordle */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
            📝 Daily Games
            <Badge variant="secondary" className="text-xs w-fit">+2 to +10 points</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyGamesSection />
        </CardContent>
      </Card>

      {/* Available Quizzes */}
      <AvailableQuizzes user={user} />

      {/* Personal Trivia */}
      <PersonalTrivia user={user} />
    </div>
  );
}
