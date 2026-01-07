'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Minus, Users, TrendingUp, RotateCcw } from 'lucide-react';

type TeamScore = {
  id: number;
  name: string;
  totalScore: number;
  manualPoints?: number;
  memberCount: number;
};

export default function ManageTeamScoresPage() {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [adjustments, setAdjustments] = useState<{ [key: number]: { points: string; reason: string } }>({});

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (teamId: number, isAdd: boolean) => {
    const adjustment = adjustments[teamId];
    if (!adjustment || !adjustment.points || adjustment.points === '0') {
      toast.error('Please enter a valid point value');
      return;
    }

    const points = parseInt(adjustment.points);
    if (isNaN(points) || points <= 0) {
      toast.error('Please enter a positive number');
      return;
    }

    const finalAdjustment = isAdd ? points : -points;

    setAdjusting(teamId);
    try {
      const response = await fetch(`/api/admin/teams/${teamId}/adjust-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: finalAdjustment,
          reason: adjustment.reason || 'Manual adjustment'
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        // Clear the form
        setAdjustments(prev => ({
          ...prev,
          [teamId]: { points: '', reason: '' }
        }));
        
        // Refresh teams
        fetchTeams();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to adjust points');
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error('Failed to adjust points');
    } finally {
      setAdjusting(null);
    }
  };

  const updateAdjustment = (teamId: number, field: 'points' | 'reason', value: string) => {
    setAdjustments(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        points: prev[teamId]?.points || '',
        reason: prev[teamId]?.reason || '',
        [field]: value
      }
    }));
  };

  const handleResetAllScores = async () => {
    const confirmed = window.confirm(
      '⚠️ COMPLETE SCOREBOARD RESET\n\n' +
      'This will DELETE:\n' +
      '• Quiz session attempts and scores\n' +
      '• Wordle game attempts\n' +
      '• Emoji game attempts\n' +
      '• Verse Drop game attempts\n' +
      '• Manual point adjustments\n\n' +
      'This will PRESERVE:\n' +
      '✓ Collaboration cards and insights\n\n' +
      'ALL teams will return to 0 points.\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = window.confirm(
      'FINAL CONFIRMATION\n\n' +
      'Click OK to permanently delete all game data and reset all scores to 0.\n' +
      '(Collaboration cards will be kept)'
    );

    if (!doubleConfirm) return;

    setResettingAll(true);
    try {
      const response = await fetch('/api/admin/teams/reset-all-scores', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `✅ Scoreboard Reset Complete!\n` +
          `Deleted ${data.details.deletedRecords.total} game records\n` +
          `Reset ${data.details.teamsReset} teams to 0 points`
        );
        fetchTeams(); // Refresh teams
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset scoreboard');
      }
    } catch (error) {
      console.error('Error resetting scoreboard:', error);
      toast.error('Failed to reset scoreboard');
    } finally {
      setResettingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading teams...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Team Scores</h1>
            <p className="text-gray-600">Manually adjust team points by adding or subtracting values</p>
          </div>
          <Button
            onClick={handleResetAllScores}
            disabled={resettingAll}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {resettingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Resetting Scoreboard...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Entire Scoreboard
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>{team.name}</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {team.totalScore} points
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  {team.memberCount} members
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display manual adjustment if exists */}
              {team.manualPoints !== undefined && team.manualPoints !== 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Manual Adjustment:</strong> {team.manualPoints > 0 ? '+' : ''}{team.manualPoints} points
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Points Input */}
                <div>
                  <Label htmlFor={`points-${team.id}`}>Points to Add/Subtract</Label>
                  <Input
                    id={`points-${team.id}`}
                    type="number"
                    min="0"
                    placeholder="Enter points (e.g., 50)"
                    value={adjustments[team.id]?.points || ''}
                    onChange={(e) => updateAdjustment(team.id, 'points', e.target.value)}
                  />
                </div>

                {/* Reason Input */}
                <div>
                  <Label htmlFor={`reason-${team.id}`}>Reason (Optional)</Label>
                  <Input
                    id={`reason-${team.id}`}
                    type="text"
                    placeholder="e.g., Bonus for participation"
                    value={adjustments[team.id]?.reason || ''}
                    onChange={(e) => updateAdjustment(team.id, 'reason', e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAdjustment(team.id, true)}
                  disabled={adjusting === team.id || !adjustments[team.id]?.points}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {adjusting === team.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Points
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleAdjustment(team.id, false)}
                  disabled={adjusting === team.id || !adjustments[team.id]?.points}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {adjusting === team.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Subtracting...
                    </>
                  ) : (
                    <>
                      <Minus className="h-4 w-4 mr-2" />
                      Subtract Points
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
