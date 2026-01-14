/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ActiveFlipGamesProps {
  activeGames: any[];
  closingGame: number | null;
  onCloseGame: (gameId: number, gameTitle: string) => void;
}

export function ActiveFlipGames({ activeGames, closingGame, onCloseGame }: ActiveFlipGamesProps) {
  if (activeGames.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🟢 Active Flip Games
          <Badge variant="default">{activeGames.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeGames.map((game: any) => (
            <div key={game.id} className="flex items-center justify-between p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-pink-800">{game.title}</h3>
                <p className="text-sm text-pink-600">
                  From: {game.book?.name || 'Unknown Book'} {game.fromChapter}:{game.fromVerse} - {game.toChapter}:{game.toVerse}
                </p>
                <p className="text-xs text-pink-500">
                  {game.flipAttempts?.length || 0} attempts • 
                  {game.flipAttempts?.filter((a: any) => a.won).length || 0} wins • 
                  Created: {new Date(game.createdDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
