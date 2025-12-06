/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';

// Import all our new components
import { QuickStats } from '../../../components/dashboard/QuickStats';
import { QuickActions } from '../../../components/dashboard/QuickActions';
import { ActiveQuizzes } from '../../../components/dashboard/ActiveQuizzes';
import { ActiveWordles } from '../../../components/dashboard/ActiveWordles';
import { CurrentActiveWordle } from '../../../components/dashboard/CurrentActiveWordle';
import { QuizzesNeedingCorrection } from '../../../components/dashboard/QuizzesNeedingCorrection';
import { RecentActivity } from '../../../components/dashboard/RecentActivity';
import { WordleManagement } from '../../../components/dashboard/WordleManagement';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closingQuiz, setClosingQuiz] = useState<number | null>(null);
  const [closingWordle, setClosingWordle] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQuiz = async (quizId: number, quizTitle: string) => {
    if (!confirm(`Are you sure you want to close "${quizTitle}"? This will:\n• Stop new submissions\n• Generate personalized trivia for all participants\n• This action cannot be undone.`)) {
      return;
    }

    setClosingQuiz(quizId);

    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Quiz "${quizTitle}" closed successfully!\n\n• ${result.quiz.participants} participants\n• ${result.triviaGenerated.total} trivia items generated`);
        
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`❌ Error closing quiz: ${error.error}`);
      }
    } catch (error) {
      console.error('Error closing quiz:', error);
      alert('❌ Network error while closing quiz');
    } finally {
      setClosingQuiz(null);
    }
  };

  const handleCloseWordle = async (wordleId: number, wordleTitle: string) => {
    if (!confirm(`Are you sure you want to close "${wordleTitle}"? This will:\n• Stop new Wordle attempts\n• Remove it from member view\n• This action cannot be undone.`)) {
      return;
    }

    setClosingWordle(wordleId);

    try {
      const response = await fetch(`/api/admin/wordle/${wordleId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Wordle "${wordleTitle}" closed successfully!\n\n• ${result.stats.totalAttempts} total attempts\n• ${result.stats.uniquePlayers} unique players\n• ${result.stats.winRate}% win rate`);
        
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`❌ Error closing wordle: ${error.error}`);
      }
    } catch (error) {
      console.error('Error closing wordle:', error);
      alert('❌ Network error while closing wordle');
    } finally {
      setClosingWordle(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Failed to load dashboard data.</p>
        </div>
      </div>
    );
  }

  const { stats, recentSessions, recentWordleAttempts, quizzesNeedingCorrection, allQuizzes, allWordles } = dashboardData;

  // Get active quizzes and wordles
  const activeQuizzes = allQuizzes.filter((quiz: any) => quiz.isActive);
  const activeWordles = allWordles.filter((wordle: any) => wordle.isActive);

  console.log('Dashboard Data:', dashboardData);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage quizzes, teams, and daily activities</p>
      </div>

      {/* Quick Stats */}
      <QuickStats 
        stats={stats} 
        activeWordlesCount={activeWordles.length} 
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Active Quizzes */}
      <ActiveQuizzes 
        activeQuizzes={activeQuizzes}
        closingQuiz={closingQuiz}
        onCloseQuiz={handleCloseQuiz}
      />

      {/* Active Wordles */}
      <ActiveWordles 
        activeWordles={activeWordles}
        closingWordle={closingWordle}
        onCloseWordle={handleCloseWordle}
      />

      {/* Current Active Wordle */}
      <CurrentActiveWordle activeWordle={stats.activeWordle} />

      {/* Quizzes Needing Correction */}
      <QuizzesNeedingCorrection quizzes={quizzesNeedingCorrection} />

      {/* Recent Activity */}
      <RecentActivity 
        recentSessions={recentSessions}
        recentWordleAttempts={recentWordleAttempts}
      />

      {/* Wordle Management */}
      <WordleManagement allWordles={allWordles} />
    </div>
  );
}