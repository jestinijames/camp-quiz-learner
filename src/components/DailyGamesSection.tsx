/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/DailyGamesSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type WordleGame = {
  id: number;
  title: string;
  bookName: string;
  hasAttempt: boolean;
  attempt: any;
};

type EmojiGame = {
  id: number;
  title: string;
  bookName: string;
  passage: string;
  hasAttempt: boolean;
  attempt: any;
};

export function DailyGamesSection() {
  const router = useRouter();
  const [wordleGames, setWordleGames] = useState<WordleGame[]>([]);
  const [emojiGames, setEmojiGames] = useState<EmojiGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const [wordleRes, emojiRes] = await Promise.all([
          fetch('/api/wordle/available'),
          fetch('/api/emoji/available')
        ]);

        if (wordleRes.ok) {
          const wordleData = await wordleRes.json();
          setWordleGames(wordleData.wordles || []);
        }

        if (emojiRes.ok) {
          const emojiData = await emojiRes.json();
          setEmojiGames(emojiData.games || []);
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎮 Daily Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading games...</div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyGames = wordleGames.length > 0 || emojiGames.length > 0;

  if (!hasAnyGames) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎮 Daily Games
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Quick mini-games to test your Bible knowledge
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Wordle Games */}
        {wordleGames.map(wordle => (
          <div
            key={`wordle-${wordle.id}`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="font-semibold text-sm">{wordle.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Bible Wordle • {wordle.bookName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {wordle.hasAttempt ? (
                wordle.attempt.completed ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    ✓ {wordle.attempt.points} pts
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/wordle/${wordle.id}`)}
                    variant="outline"
                  >
                    Continue
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push(`/wordle/${wordle.id}`)}
                >
                  Play Now
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Emoji Games */}
        {emojiGames.map(emoji => (
          <div
            key={`emoji-${emoji.id}`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📱</span>
              <div>
                <h3 className="font-semibold text-sm">{emoji.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Emoji Verse • {emoji.bookName} {emoji.passage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {emoji.hasAttempt ? (
                emoji.attempt.completed ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    ✓ {emoji.attempt.points} pts
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/emoji/${emoji.id}`)}
                    variant="outline"
                  >
                    Continue
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push(`/emoji/${emoji.id}`)}
                >
                  Play Now
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}