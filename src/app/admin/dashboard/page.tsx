/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  BookOpen, 
  Trophy, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Bot,
  FileText,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

type DashboardData = {
  stats: {
    totalQuizzes: number;
    totalMembers: number;
    totalTeams: number;
    activeQuizzes: number;
  };
  recentSessions: any[];
  quizzesNeedingCorrection: any[];
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard data received:', data); // DEBUG LINE
          console.log('Corrections needed:', data.quizzesNeedingCorrection?.length); // DEBUG LINE
          setDashboardData(data);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (error) {
        console.log('Dashboard fetch error:', error); // DEBUG LINE
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <Link href="/admin/quiz/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {dashboardData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                    <p className="text-3xl font-bold">{dashboardData.stats.totalQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Members</p>
                    <p className="text-3xl font-bold">{dashboardData.stats.totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teams</p>
                    <p className="text-3xl font-bold">{dashboardData.stats.totalTeams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Quizzes</p>
                    <p className="text-3xl font-bold">{dashboardData.stats.activeQuizzes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NEW: Pending Corrections Section */}
          {dashboardData.quizzesNeedingCorrection && dashboardData.quizzesNeedingCorrection.length > 0 && (
            <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Quizzes Needing Correction</span>
                  <Badge variant="destructive" className="ml-2">
                    {dashboardData.quizzesNeedingCorrection.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  These quizzes have submitted descriptive answers that need AI or manual correction
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.quizzesNeedingCorrection.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {quiz.title}
                          </h4>
                          <Badge variant="outline">
                            {quiz.book.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {quiz.fromChapter}:{quiz.fromVerse} - {quiz.toChapter}:{quiz.toVerse}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{quiz.totalSessions} participants</span>
                          </span>
                          <span className="flex items-center space-x-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{quiz.uncorrectedAnswers} answers need correction</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {quiz.sessionsNeedingCorrection}/{quiz.totalSessions}
                          </p>
                          <p className="text-gray-500">sessions pending</p>
                        </div>

                        <Link href={`/admin/quiz/${quiz.id}/corrections`}>
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Bot className="h-4 w-4 mr-2" />
                            Correct Answers
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Quiz Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Quiz Sessions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentSessions.length > 0 ? (
                    dashboardData.recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{session.member.name}</p>
                          <p className="text-sm text-gray-500">
                            {session.quiz.title} • {session.member.team.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(session.startTime)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {session.totalScore !== null && (
                            <Badge variant="outline">
                              {session.totalScore} pts
                            </Badge>
                          )}
                          {session.isSubmitted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent sessions</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/admin/quiz/create">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-6 w-6 text-blue-500" />
                        <div className="text-left">
                          <p className="font-medium">Create New Quiz</p>
                          <p className="text-sm text-gray-500">Generate questions with AI</p>
                        </div>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/admin/teams">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <Users className="h-6 w-6 text-green-500" />
                        <div className="text-left">
                          <p className="font-medium">Manage Teams</p>
                          <p className="text-sm text-gray-500">Add members and organize teams</p>
                        </div>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/admin/bible">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-6 w-6 text-purple-500" />
                        <div className="text-left">
                          <p className="font-medium">Manage Bible Data</p>
                          <p className="text-sm text-gray-500">Add books, chapters, and verses</p>
                        </div>
                      </div>
                    </Button>
                  </Link>

                  {dashboardData.quizzesNeedingCorrection.length > 0 && (
                    <Link href={`/admin/quiz/${dashboardData.quizzesNeedingCorrection[0].id}/corrections`}>
                      <Button className="w-full justify-start h-auto p-4 bg-orange-600 hover:bg-orange-700">
                        <div className="flex items-center space-x-3">
                          <Bot className="h-6 w-6 text-white" />
                          <div className="text-left">
                            <p className="font-medium text-white">Correct Quiz Answers</p>
                            <p className="text-sm text-orange-100">
                              {dashboardData.quizzesNeedingCorrection.reduce((sum, q) => sum + q.uncorrectedAnswers, 0)} answers pending
                            </p>
                          </div>
                        </div>
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}