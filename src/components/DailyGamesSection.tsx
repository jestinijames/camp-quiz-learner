/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/DailyGamesSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { WordleGameModal } from './WordleGameModal';
import { EmojiGameModal } from './EmojiGameModal';
import { VerseDropGameModal } from './VerseDropGameModal';
import { Button } from './ui/button';
import { Droplets } from 'lucide-react';

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

type VerseDropGame = {
  id: number;
  title: string;
  book: string;
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  timeLimit: number;
};

export function DailyGamesSection() {
  const [wordleData, setWordleData] = useState<{ available: boolean; wordle?: WordleGame } | null>(null);
  const [emojiGames, setEmojiGames] = useState<EmojiGame[]>([]);
  const [verseDropData, setVerseDropData] = useState<{ available: boolean; game?: VerseDropGame } | null>(null);
  const [loading, setLoading] = useState(true);
  const [verseDropModalOpen, setVerseDropModalOpen] = useState(false);

  const fetchGames = async () => {
    try {
      const [wordleRes, emojiRes, verseDropRes] = await Promise.all([
        fetch('/api/wordle/available'),
        fetch('/api/emoji/available'),
        fetch('/api/verse-drop/available')
      ]);

      if (wordleRes.ok) {
        const wordleData = await wordleRes.json();
        setWordleData(wordleData);
      }

      if (emojiRes.ok) {
        const emojiData = await emojiRes.json();
        setEmojiGames(emojiData.games || []);
      }

      if (verseDropRes.ok) {
        const verseDropData = await verseDropRes.json();
        setVerseDropData(verseDropData);
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

  const handleVerseDropComplete = () => {
    setVerseDropModalOpen(false);
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
  const hasVerseDropGame = verseDropData?.available && verseDropData.game;
  const hasAnyGames = hasWordleGame || hasEmojiGames || hasVerseDropGame;

  if (!hasAnyGames) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-4">🎮</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No games available right now
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

      {/* Verse Drop Game */}
      {hasVerseDropGame && verseDropData.game && (
        <div className="text-center space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-4xl">💧</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Catch the falling words to complete a verse from{' '}
            <span className="font-semibold">
              {verseDropData.game.book} {verseDropData.game.fromChapter}:{verseDropData.game.fromVerse}
              {verseDropData.game.toChapter !== verseDropData.game.fromChapter && 
                `-${verseDropData.game.toChapter}:${verseDropData.game.toVerse}`}
            </span>
          </p>
          <Button 
            onClick={() => setVerseDropModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Droplets className="h-4 w-4 mr-2" />
            Play Verse Drop
          </Button>
          
          {verseDropModalOpen && (
            <VerseDropGameModal
              game={verseDropData.game}
              onComplete={handleVerseDropComplete}
              isOpen={verseDropModalOpen}
              onClose={() => setVerseDropModalOpen(false)}
            />
          )}
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