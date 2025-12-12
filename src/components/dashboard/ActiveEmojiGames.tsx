/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/dashboard/ActiveEmojiGames.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

type EmojiGame = {
  id: number;
  title: string;
  bookName: string;
  passage: string;
  puzzleCount: number;
  totalAttempts: number;
  completedAttempts: number;
  isActive: boolean;
  createdDate: string;
};

export function ActiveEmojiGames() {
  const router = useRouter();
  const [games, setGames] = useState<EmojiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<number | null>(null);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setGames(data.emojiGames || []);
      }
    } catch (error) {
      console.error('Failed to fetch emoji games:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCloseGame = async (gameId: number) => {
    if (!confirm('Are you sure you want to close this emoji game?')) return;

    setClosing(gameId);
    try {
      const response = await fetch(`/api/admin/emoji/${gameId}/close`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Emoji game closed successfully!');
        fetchGames();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to close game');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setClosing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📱</span>
            Emoji Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📱</span>
            Emoji Games ({games.length})
          </span>
          <Button
            size="sm"
            onClick={() => router.push('/admin/emoji/create')}
          >
            + New Game
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {games.length === 0 ? (
          <p className="text-sm text-gray-500">No emoji games yet</p>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <div
                key={game.id}
                className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{game.title}</h3>
                      <Badge variant={game.isActive ? 'default' : 'secondary'}>
                        {game.isActive ? 'Active' : 'Closed'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      📖 {game.bookName} {game.passage}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {game.puzzleCount} puzzles • {game.completedAttempts}/{game.totalAttempts} completed
                    </p>
                  </div>
                  {game.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCloseGame(game.id)}
                      disabled={closing === game.id}
                    >
                      {closing === game.id ? 'Closing...' : 'Close'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}