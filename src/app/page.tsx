/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Target, Award, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TeamScore = {
  id: number;
  name: string;
  memberCount: number;
  totalScore: number;
  completedQuizzes: number;
  averageScore: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [personalTrivia, setPersonalTrivia] = useState([]);

  const fetchTeamScores = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const scores = await response.json();
        setTeamScores(scores);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch team scores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamScores();

    // Refresh scores every 30 seconds
    const interval = setInterval(fetchTeamScores, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user || user.isAdmin) return;

      setLoadingQuizzes(true);
      try {
        const response = await fetch('/api/quiz/available');
        if (response.ok) {
          const quizzes = await response.json();
          setAvailableQuizzes(quizzes);
        }
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    const fetchPersonalTrivia = async () => {
      if (!user || user.isAdmin) return; // Don't fetch for admins
      
      try {
        const response = await fetch('/api/member/personal-trivia');
        if (response.ok) {
          const trivia = await response.json();
          console.log('Personal trivia loaded:', trivia); // Debug log
          setPersonalTrivia(trivia);
        } else {
          console.error('Failed to fetch trivia:', await response.text());
        }
      } catch (error) {
        console.error('Failed to load trivia:', error);
      }
    };

    fetchPersonalTrivia();
  }, [user]); // Add user as dependency

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Award className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="h-6 w-6 flex items-center justify-center text-sm font-bold text-gray-600">#{index + 1}</div>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 2:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            {/* Logo Placeholder */}
            <div className="mx-auto w-20 h-20 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Church Quiz Championship
            </h1>
            
            {user && !user.isAdmin && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <Users className="h-4 w-4 mr-2" />
                  Team {user.team?.name}
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Welcome, {user.name}!
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Scores Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Live Team Standings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <button
            onClick={fetchTeamScores}
            className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm underline"
          >
            Refresh Scores
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Team Scores Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamScores.map((team, index) => (
              <Card 
                key={team.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  user?.team?.name === team.name ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
              >
                {/* Rank Gradient Bar */}
                <div className={`h-2 w-full ${getRankColor(index)}`}></div>
                
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center space-x-2">
                      {getRankIcon(index)}
                      <span className="truncate">{team.name}</span>
                    </CardTitle>
                    {user?.team?.name === team.name && (
                      <Badge variant="secondary" className="text-xs">
                        Your Team
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Total Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Score
                      </span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {team.totalScore}
                      </span>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{team.memberCount}</span>
                        </div>
                        <span className="text-gray-500 text-xs">Members</span>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Target className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{team.completedQuizzes}</span>
                        </div>
                        <span className="text-gray-500 text-xs">Quizzes</span>
                      </div>
                    </div>
                    
                    {/* Average Score */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Average Score</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {team.averageScore}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(team.averageScore, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && teamScores.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Quiz Data Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Team scores will appear here once quizzes are completed.
            </p>
          </div>
        )}
      </div>

      {/* Quiz Section for Team Members */}
      {user && !user.isAdmin && (
        <div className="mt-12">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center space-x-2">
                <Target className="h-6 w-6" />
                <span>Available Quizzes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingQuizzes ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4">Loading quizzes...</p>
                </div>
              ) : availableQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableQuizzes.map((quiz: any) => (
                    <Card key={quiz.id} className="border-l-4 border-l-green-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {quiz.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📚 {quiz.book.name}</span>
                            <span>❓ {quiz._count.questions} questions</span>
                            {quiz.timeLimit && (
                              <span>⏰ {quiz.timeLimit} min</span>
                            )}
                          </div>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => window.location.href = `/quiz/${quiz.id}`}
                        >
                          Take Quiz
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No Active Quizzes
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    New quizzes will appear here when available.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personal Bible Journey Section */}
      {user && !user.isAdmin && (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                <span>Your Personal Bible Journey</span>
                <Badge variant="secondary">{personalTrivia.length} Insights</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personalTrivia.map((item: any, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    item.type === 'ENCOURAGEMENT' ? 'border-l-green-500 bg-green-50' :
                    item.type === 'INSIGHT' ? 'border-l-blue-500 bg-blue-50' :
                    'border-l-orange-500 bg-orange-50'
                  }`}>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-700 mb-3">{item.content}</p>
                    
                    {item.insight && (
                      <div className="bg-white p-3 rounded border-l-2 border-l-purple-300 mb-3">
                        <p className="text-purple-700 text-sm font-medium">💝 Personal Note:</p>
                        <p className="text-purple-600 text-sm">{item.insight}</p>
                      </div>
                    )}
                    
                    {item.studyTips && (
                      <div className="bg-blue-50 p-3 rounded border-l-2 border-l-blue-300 mb-3">
                        <p className="text-blue-700 text-sm font-medium">📖 Study Action:</p>
                        <p className="text-blue-600 text-sm">{item.studyTips}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      {item.suggestedReading && (
                        <Badge variant="outline" className="text-xs">
                          📖 {item.suggestedReading}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}