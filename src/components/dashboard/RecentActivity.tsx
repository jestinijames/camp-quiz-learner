/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface RecentActivityProps {
  recentSessions: any[];
  recentWordleAttempts: any[];
}

export function RecentActivity({ recentSessions, recentWordleAttempts }: RecentActivityProps) {
  return (
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
  );
}