"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { QuickStats } from '../../../components/dashboard/QuickStats';
import { QuickActions } from '../../../components/dashboard/QuickActions';
import { ActiveQuizzes } from '../../../components/dashboard/ActiveQuizzes';
import { ActiveWordles } from '../../../components/dashboard/ActiveWordles';
import { CurrentActiveWordle } from '../../../components/dashboard/CurrentActiveWordle';
import { QuizzesNeedingCorrection } from '../../../components/dashboard/QuizzesNeedingCorrection';
import { RecentActivity } from '../../../components/dashboard/RecentActivity';
import { WordleManagement } from '../../../components/dashboard/WordleManagement';
import { ActiveEmojiGames } from '@/components/dashboard/ActiveEmojiGames';
import { TeamScoreboard } from '@/components/TeamScoreboard';

export default function AdminDashboard() {

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingQuiz, setClosingQuiz] = useState<number | null>(null);
  const [closingWordle, setClosingWordle] = useState<number | null>(null);


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      if (response.ok) {
        setDashboardData(data);
        setError(null);
      } else {
        setDashboardData(null);
        setError(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      setDashboardData(null);
      setError(err?.message || 'Network error');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };


  // Handler to close a quiz
  const handleCloseQuiz = async (quizId: number, quizTitle: string) => {
    if (!confirm(`Are you sure you want to close quiz "${quizTitle}"? This cannot be undone.`)) return;
    setClosingQuiz(quizId);
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/close`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert(`Quiz "${quizTitle}" closed successfully!`);
        fetchDashboardData();
      } else {
        alert(result.error || 'Failed to close quiz');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error');
    } finally {
      setClosingQuiz(null);
    }
  };

  // Handler to close a wordle
  const handleCloseWordle = async (wordleId: number, wordleTitle: string) => {
    if (!confirm(`Are you sure you want to close wordle "${wordleTitle}"? This cannot be undone.`)) return;
    setClosingWordle(wordleId);
    try {
      const response = await fetch(`/api/admin/wordle/${wordleId}/close`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert(`Wordle "${wordleTitle}" closed successfully!`);
        fetchDashboardData();
      } else {
        alert(result.error || 'Failed to close wordle');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error');
    } finally {
      setClosingWordle(null);
    }
  };

  const stats = dashboardData?.stats || {
    totalQuizzes: 0,
    totalMembers: 0,
    totalTeams: 0,
    activeQuizzes: 0,
    totalWordles: 0,
    activeWordle: null,
    totalWordleAttempts: 0,
    wordleWinRate: 0,
  };
  const recentSessions = dashboardData?.recentSessions || [];
  const recentWordleAttempts = dashboardData?.recentWordleAttempts || [];
  const quizzesNeedingCorrection = dashboardData?.quizzesNeedingCorrection || [];
  const allQuizzes = dashboardData?.allQuizzes || [];
  const allWordles = dashboardData?.allWordles || [];
  const activeQuizzes = allQuizzes.filter((quiz: any) => quiz.isActive);
  const activeWordles = allWordles.filter((wordle: any) => wordle.isActive);
  // const emojiGames = dashboardData?.emojiGames || [];

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage quizzes, teams, and daily activities</p>
        {error && (
          <p className="text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Quick Stats */}
      <QuickStats 
        stats={stats} 
        activeWordlesCount={activeWordles.length} 
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Team Scoreboard - Admin View */}
      <TeamScoreboard />

      {/* Active Quizzes */}

      <ActiveQuizzes activeQuizzes={activeQuizzes} closingQuiz={closingQuiz} onCloseQuiz={handleCloseQuiz} />

      {/* Active Wordles */}
      <ActiveWordles activeWordles={activeWordles} closingWordle={closingWordle} onCloseWordle={handleCloseWordle} />

      {/* Current Active Wordle */}
      <CurrentActiveWordle activeWordle={stats.activeWordle} />

      {/* Quizzes Needing Correction */}
      <QuizzesNeedingCorrection quizzes={quizzesNeedingCorrection} />

      {/* Recent Activity */}
      <RecentActivity recentSessions={recentSessions} recentWordleAttempts={recentWordleAttempts} />

      {/* Wordle Management */}
      <WordleManagement allWordles={allWordles} />

      {/* Active Emoji Games */}
      <ActiveEmojiGames />
    </div>
  );
}
