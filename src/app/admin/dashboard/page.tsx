'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type MemberScore = {
  id: number;
  name: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalScore: number;
  quizSessions: number;
};

type TeamWithScores = {
  id: number;
  name: string;
  totalMembers: number;
  totalTeamScore: number;
  averageScore: number;
  members: MemberScore[];
};

export default function AdminDashboard() {
  const [teams, setTeams] = useState<TeamWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard');
      setTeams(response.data);
    } catch (error) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(percentage: number) {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function calculatePercentage(correct: number, total: number) {
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No teams found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{teams.length}</div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {teams.reduce((acc, team) => acc + team.totalMembers, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {teams.reduce((acc, team) => acc + team.totalTeamScore, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {teams.length > 0 
                    ? Math.round(teams.reduce((acc, team) => acc + team.averageScore, 0) / teams.length)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Teams and Members */}
          <div className="space-y-6">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{team.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {team.totalMembers} members
                      </Badge>
                      <Badge variant="secondary">
                        {team.totalTeamScore} total points
                      </Badge>
                      <Badge 
                        variant="secondary"
                        className={`text-white ${getScoreColor(team.averageScore)}`}
                      >
                        {team.averageScore}% avg
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {team.members.length === 0 ? (
                    <p className="text-muted-foreground">No members in this team</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Member</th>
                            <th className="text-center py-2">Quiz Sessions</th>
                            <th className="text-center py-2">Questions</th>
                            <th className="text-center py-2">Correct</th>
                            <th className="text-center py-2">Wrong</th>
                            <th className="text-center py-2">Accuracy</th>
                            <th className="text-center py-2">Total Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.members.map((member) => {
                            const accuracy = calculatePercentage(member.correctAnswers, member.totalQuestions);
                            return (
                              <tr key={member.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 font-medium">{member.name}</td>
                                <td className="text-center">
                                  <Badge variant="outline">{member.quizSessions}</Badge>
                                </td>
                                <td className="text-center">{member.totalQuestions}</td>
                                <td className="text-center">
                                  <span className="text-green-600 font-medium">
                                    {member.correctAnswers}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="text-red-600 font-medium">
                                    {member.wrongAnswers}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <Badge 
                                    variant="secondary"
                                    className={`text-white ${getScoreColor(accuracy)}`}
                                  >
                                    {accuracy}%
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  <span className="font-bold text-blue-600">
                                    {member.totalScore}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}