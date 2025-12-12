/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/DailyGamesSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { WordleGameModal } from './WordleGameModal';
import { EmojiGameModal } from './EmojiGameModal';

type WordleGame = {
  id: number;
  title: string;
  hint: string;
  book: string;
};

type EmojiGame = {
  id: number;
  title: string;
  bookName: string;
  passage: string;
  hint?: string;
};

export function DailyGamesSection() {
  const [wordleData, setWordleData] = useState<{ available: boolean; wordle?: WordleGame } | null>(null);
  const [emojiGames, setEmojiGames] = useState<EmojiGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      const [wordleRes, emojiRes] = await Promise.all([
        fetch('/api/wordle/available'),
        fetch('/api/emoji/available')
      ]);

      if (wordleRes.ok) {
        const wordleData = await wordleRes.json();
        setWordleData(wordleData);
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

  useEffect(() => {
    fetchGames();
  }, []);

  const handleWordleComplete = () => {
    fetchGames(); // Refresh after completion
  };

  const handleEmojiComplete = () => {
    fetchGames(); // Refresh after completion
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading games...</p>
      </div>
    );
  }

  const hasWordleGame = wordleData?.available && wordleData.wordle;
  const hasEmojiGames = emojiGames.length > 0;
  const hasAnyGames = hasWordleGame || hasEmojiGames;

  if (!hasAnyGames) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-4">🎮</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No daily games available right now
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Check back later for new games!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Wordle Game */}
      {hasWordleGame && wordleData.wordle && (
        <div className="text-center space-y-3">
          <div className="text-4xl">📖</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Guess today&apos;s 5-letter Biblical word from <span className="font-semibold">{wordleData.wordle.book}</span>
          </p>
          <WordleGameModal
            wordle={wordleData.wordle}
            onComplete={handleWordleComplete}
          />
        </div>
      )}

      {/* Emoji Games */}
      {emojiGames.map(emoji => (
        <div key={`emoji-${emoji.id}`} className="text-center space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-4xl">📱</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Identify the verse from <span className="font-semibold">{emoji.bookName} {emoji.passage}</span>
          </p>
          <EmojiGameModal
            game={emoji}
            onComplete={handleEmojiComplete}
          />
        </div>
      ))}
    </div>
  );
}