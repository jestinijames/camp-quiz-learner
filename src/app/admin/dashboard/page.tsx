/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage quizzes, teams, and daily activities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</div>
            <div className="text-sm text-gray-600">Total Quizzes</div>
            <div className="text-xs text-green-600">{stats.activeQuizzes} active</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalWordles}</div>
            <div className="text-sm text-gray-600">Total Wordles</div>
            <div className="text-xs text-blue-600">
              {stats.activeWordle ? `"${stats.activeWordle.word}" active` : 'None active'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalMembers}</div>
            <div className="text-sm text-gray-600">Total Members</div>
            <div className="text-xs text-gray-500">{stats.totalTeams} teams</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalWordleAttempts}</div>
            <div className="text-sm text-gray-600">Wordle Attempts</div>
            <div className="text-xs text-green-600">{stats.wordleWinRate} wins</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/quiz/create">
              <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📝</span>
                <span>Create Quiz</span>
              </Button>
            </Link>
            
            <Link href="/admin/wordle/create">
              <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700">
                <span className="text-2xl">🔤</span>
                <span>Create Wordle</span>
              </Button>
            </Link>

            <Link href="/admin/teams">
              <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
                <span className="text-2xl">👥</span>
                <span>Manage Teams</span>
              </Button>
            </Link>

            <Link href="/admin/bible">
              <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
                <span className="text-2xl">📖</span>
                <span>Bible Data</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Current Active Wordle */}
      {stats.activeWordle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔤 Active Daily Wordle
              <Badge variant="secondary">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">{stats.activeWordle.title}</h3>
                  <p className="text-green-600">Answer: <span className="font-bold tracking-wider">{stats.activeWordle.word}</span></p>
                  <p className="text-sm text-green-600">From: {stats.activeWordle.book}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.activeWordle.attempts}</div>
                  <div className="text-sm text-green-600">Attempts</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quizzes Needing Correction */}
      {quizzesNeedingCorrection.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚨 Quizzes Needing Correction
              <Badge variant="destructive">{quizzesNeedingCorrection.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quizzesNeedingCorrection.map((quiz: any) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-red-800">{quiz.title}</h3>
                    <p className="text-sm text-red-600">
                      {quiz.book?.name} • {quiz.uncorrectedAnswers} uncorrected answers
                    </p>
                  </div>
                  <Link href={`/admin/quiz/${quiz.id}/corrections`}>
                    <Button size="sm" variant="destructive">
                      Review Answers
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Quiz Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Recent Quiz Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{session.member?.name}</p>
                    <p className="text-sm text-gray-600">
                      {session.quiz?.title} • {session.member?.team?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">
                      {session.totalScore || 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Wordle Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>🔤 Recent Wordle Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWordleAttempts.slice(0, 5).map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{attempt.member?.name}</p>
                    <p className="text-sm text-gray-600">
                      {attempt.wordle?.title} • {attempt.member?.team?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attempt.completedAt && new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <Badge variant={attempt.won ? "default" : "secondary"}>
                      {attempt.won ? `${attempt.attempts}/6 ✓` : 'Lost'}
                    </Badge>
                    <div className="text-sm font-bold mt-1">
                      {attempt.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Wordles Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔤 Wordle Management
            <Link href="/admin/wordle/create">
              <Button size="sm">Create New Wordle</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allWordles.slice(0, 10).map((wordle: any) => (
              <div key={wordle.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{wordle.title}</h3>
                  <p className="text-sm text-gray-600">
                    Word: <span className="font-mono font-bold">{wordle.word}</span> • 
                    {wordle.book?.name} • 
                    {wordle.wordleAttempts?.length || 0} attempts
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(wordle.createdDate).toLocaleDateString()}
                    {wordle.isActive && <Badge variant="default" className="ml-2">Active</Badge>}
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {wordle.wordleAttempts?.filter((a: any) => a.won).length || 0}/
                    {wordle.wordleAttempts?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Win Rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}