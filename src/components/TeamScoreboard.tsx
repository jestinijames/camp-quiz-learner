'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, RefreshCw } from 'lucide-react';

type TeamScore = {
  id: number;
  name: string;
  memberCount: number;
  totalScore: number;
  completedQuizzes: number;
  averageScore: number;
};

type User = {
  name: string;
  team?: {
    name: string;
  };
};

interface TeamScoreboardProps {
  user?: User | null;
}

export function TeamScoreboard({ user }: TeamScoreboardProps) {
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTeamScores = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamScores();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading scoreboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg">
          <span>🏆 Team Scoreboard</span>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Updated: {lastUpdated.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              })}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchTeamScores(true)}
              disabled={refreshing}
              className="text-xs px-2 py-1"
            >
              {refreshing ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {teamScores
          .sort((a, b) => {
            // If scores are different, sort by score descending
            if (a.totalScore !== b.totalScore) {
              return b.totalScore - a.totalScore;
            }
            // If scores are the same (including 0), sort alphabetically
            return a.name.localeCompare(b.name);
          })
          .map((team, index) => (
          <div
            key={team.id}
            className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all ${
              user?.team?.name === team.name 
                ? 'border-blue-300 bg-blue-50 ring-1 sm:ring-2 ring-blue-200' 
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h3 className="font-semibold text-sm sm:text-lg wrap-break-word leading-tight">
                    {team.name}
                  </h3>
                  {user?.team?.name === team.name && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 w-fit">
                      Your Team
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right ml-2">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {team.totalScore}
              </div>
            </div>
          </div>
        ))}

        {teamScores.length === 0 && (
          <div className="text-center py-6 sm:py-8">
            <p className="text-gray-500 text-sm sm:text-base">No team scores available yet.</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Complete some quizzes to see the leaderboard!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}