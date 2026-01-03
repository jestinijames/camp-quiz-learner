/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent } from '../ui/card';

interface QuickStatsProps {
  stats: {
    totalQuizzes: number;
    activeQuizzes: number;
    totalWordles: number;
    totalMembers: number;
    totalTeams: number;
    totalWordleAttempts: number;
    wordleWinRate: string;
  };
  activeQuizzesCount: number;
  activeWordlesCount: number;
  activeEmojiGamesCount: number;
}

export function QuickStats({ stats, activeQuizzesCount, activeWordlesCount, activeEmojiGamesCount }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</div>
          <div className="text-sm text-gray-600">Total Quizzes</div>
          <div className="text-xs text-green-600">
            {activeQuizzesCount > 0 ? `${activeQuizzesCount} active` : 'None active'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalWordles}</div>
          <div className="text-sm text-gray-600">Total Wordles</div>
          <div className="text-xs text-blue-600">
            {activeWordlesCount > 0 ? `${activeWordlesCount} active` : 'None active'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {activeEmojiGamesCount}
          </div>
          <div className="text-sm text-gray-600">Emoji Games</div>
          <div className="text-xs text-blue-600">
            {activeEmojiGamesCount > 0 ? `${activeEmojiGamesCount} active` : 'None active'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.totalMembers}</div>
          <div className="text-sm text-gray-600">Total Members</div>
          <div className="text-xs text-gray-500">{stats.totalTeams} teams</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-pink-600">{stats.totalWordleAttempts}</div>
          <div className="text-sm text-gray-600">Wordle Attempts</div>
          <div className="text-xs text-green-600">{stats.wordleWinRate} wins</div>
        </CardContent>
      </Card>
    </div>
  );
}