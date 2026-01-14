"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { QuickStats } from '../../../components/dashboard/QuickStats';
import { QuickActions } from '../../../components/dashboard/QuickActions';
import { ActiveQuizzes } from '../../../components/dashboard/ActiveQuizzes';
import { ActiveWordles } from '../../../components/dashboard/ActiveWordles';
import { QuizzesNeedingCorrection } from '../../../components/dashboard/QuizzesNeedingCorrection';
import { RecentActivity } from '../../../components/dashboard/RecentActivity';
import { ActiveEmojiGames } from '@/components/dashboard/ActiveEmojiGames';
import { ActiveVerseDropGames } from '@/components/dashboard/ActiveVerseDropGames';
import { ActiveFlipGames } from '@/components/dashboard/ActiveFlipGames';
import { ActiveCollaborationWalls } from '@/components/dashboard/ActiveCollaborationWalls';
import { TeamScoreboard } from '@/components/TeamScoreboard';
import { SessionControl } from '@/components/dashboard/SessionControl';

export default function AdminDashboard() {

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingQuiz, setClosingQuiz] = useState<number | null>(null);
  const [closingWordle, setClosingWordle] = useState<number | null>(null);
  const [closingEmojiGame, setClosingEmojiGame] = useState<number | null>(null);
  const [closingVerseDropGame, setClosingVerseDropGame] = useState<number | null>(null);
  const [closingFlipGame, setClosingFlipGame] = useState<number | null>(null);
  const [closingWallSession, setClosingWallSession] = useState<number | null>(null);


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
        toast.success(`Quiz "${quizTitle}" closed successfully!`);
        fetchDashboardData();
      } else {
        toast.error(result.error || 'Failed to close quiz');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
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
        toast.success(`Wordle "${wordleTitle}" closed successfully!`);
        fetchDashboardData();
      } else {
        toast.error(result.error || 'Failed to close wordle');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setClosingWordle(null);
    }
  };

  const handleCloseEmojiGame = async (gameId: number, gameTitle: string) => {
    if (!confirm(`Are you sure you want to close "${gameTitle}"?`)) return;

    setClosingEmojiGame(gameId);
    try {
      const response = await fetch(`/api/admin/emoji/${gameId}/close`, { method: 'POST' });
      if (response.ok) {
        toast.success('Emoji game closed successfully!');
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to close emoji game');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setClosingEmojiGame(null);
    }
  };

  const handleCloseVerseDropGame = async (gameId: number, gameTitle: string) => {
    if (!confirm(`Are you sure you want to close "${gameTitle}"?`)) return;

    setClosingVerseDropGame(gameId);
    try {
      const response = await fetch(`/api/admin/verse-drop/${gameId}/close`, { method: 'POST' });
      if (response.ok) {
        toast.success('Verse Drop game closed successfully!');
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to close Verse Drop game');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setClosingVerseDropGame(null);
    }
  };

  const handleCloseFlipGame = async (gameId: number, gameTitle: string) => {
    if (!confirm(`Are you sure you want to close "${gameTitle}"?`)) return;

    setClosingFlipGame(gameId);
    try {
      const response = await fetch('/api/admin/flip/close', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });
      if (response.ok) {
        toast.success('Flip game closed successfully!');
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to close flip game');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setClosingFlipGame(null);
    }
  };

  const handleCloseWall = async (wallId: number, wallTitle: string) => {
    if (!confirm(`Are you sure you want to close "${wallTitle}"? This cannot be undone.`)) return;
    setClosingWallSession(wallId);
    try {
      const response = await fetch(`/api/admin/collaboration-walls/${wallId}/toggle`, { method: 'PATCH' });
      const result = await response.json();
      if (result.success) {
        toast.success(`Collaboration wall "${wallTitle}" closed successfully!`);
        fetchDashboardData();
      } else {
        toast.error(result.error || 'Failed to close collaboration wall');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    } finally {
      setClosingWallSession(null);
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
  const emojiGames = dashboardData?.emojiGames || [];
  const verseDropGames = dashboardData?.verseDropGames || [];
  const flipGames = dashboardData?.flipGames || [];
  const collaborationWalls = dashboardData?.collaborationWalls || [];
  const activeQuizzes = allQuizzes.filter((quiz: any) => quiz.isActive);
  const activeWordles = allWordles.filter((wordle: any) => wordle.isActive);
  const activeEmojiGames = emojiGames.filter((game: any) => game.isActive);
  const activeVerseDropGames = verseDropGames.filter((game: any) => game.isActive);
  const activeFlipGames = flipGames.filter((game: any) => game.isActive);
  const activeCollaborationWalls = collaborationWalls.filter((wall: any) => wall.isActive);

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
        <p className="text-gray-600">Manage quizzes, teams, and activities</p>
        {error && (
          <p className="text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Quick Stats */}
      <QuickStats 
        stats={stats} 
        activeQuizzesCount={activeQuizzes.length}
        activeWordlesCount={activeWordles.length}
        activeEmojiGamesCount={activeEmojiGames.length}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Session Control - Global Toggle */}
      <SessionControl />

      {/* Team Scoreboard - Admin View */}
      <TeamScoreboard />

      {/* Active Quizzes */}

      <ActiveQuizzes activeQuizzes={activeQuizzes} closingQuiz={closingQuiz} onCloseQuiz={handleCloseQuiz} />

      {/* Active Wordles */}
      <ActiveWordles activeWordles={activeWordles} closingWordle={closingWordle} onCloseWordle={handleCloseWordle} />

      {/* Active Emoji Games */}
      <ActiveEmojiGames activeGames={activeEmojiGames} closingGame={closingEmojiGame} onCloseGame={handleCloseEmojiGame} />

      {/* Active Verse Drop Games */}
      <ActiveVerseDropGames activeGames={activeVerseDropGames} closingGame={closingVerseDropGame} onCloseGame={handleCloseVerseDropGame} />

      {/* Active Flip Games */}
      <ActiveFlipGames activeGames={activeFlipGames} closingGame={closingFlipGame} onCloseGame={handleCloseFlipGame} />

      {/* Active Collaboration Walls */}
      <ActiveCollaborationWalls activeWalls={activeCollaborationWalls} closingWall={closingWallSession} onCloseWall={handleCloseWall} />

      {/* Quizzes Needing Correction */}
      <QuizzesNeedingCorrection quizzes={quizzesNeedingCorrection} />

      {/* Recent Activity */}
      <RecentActivity recentSessions={recentSessions} recentWordleAttempts={recentWordleAttempts} />
    </div>
  );
}
