/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/dashboard/ActiveEmojiGames.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActiveEmojiGamesProps {
  activeGames: any[];
  closingGame: number | null;
  onCloseGame: (gameId: number, gameTitle: string) => void;
}

export function ActiveEmojiGames({ activeGames, closingGame, onCloseGame }: ActiveEmojiGamesProps) {
  if (activeGames.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Active Emoji Games
          <Badge variant="default">{activeGames.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeGames.map((game: any) => (
            <div key={game.id} className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-purple-800">{game.title}</h3>
                <p className="text-sm text-purple-600">
                  📖 {game.bookName} {game.passage}
                </p>
                <p className="text-xs text-purple-500">
                  {game.puzzleCount} puzzles • {game.completedAttempts}/{game.totalAttempts} completed
                </p>
              </div>
              <Button
                onClick={() => onCloseGame(game.id, game.title)}
                disabled={closingGame === game.id}
                size="sm"
                variant="destructive"
              >
                {closingGame === game.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Closing...
                  </>
                ) : (
                  <>🔒 Close Game</>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}