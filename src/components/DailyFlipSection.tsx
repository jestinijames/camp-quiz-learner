/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import FlipGameModal from './FlipGameModal';
import { Button } from './ui/button';
import { Play } from 'lucide-react';

interface FlipGameData {
  game: {
    id: number;
    title: string;
    verseData: string;
    timeLimit: number;
    bookName: string;
    versionName: string;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
  } | null;
  attempt: {
    id: number;
    completed: boolean;
    won: boolean;
    points: number;
  } | null;
}

export function DailyFlipSection() {
  const [flipData, setFlipData] = useState<FlipGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchFlipData();
  }, []);

  const fetchFlipData = async () => {
    try {
      const response = await fetch('/api/flip/active');
      if (response.ok) {
        const data = await response.json();
        setFlipData(data);
      }
    } catch (error) {
      console.error('Error fetching flip game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlipComplete = async (timeSpent: number, moves: number) => {
    if (!flipData?.game) return;

    try {
      const response = await fetch('/api/flip/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: flipData.game.id,
          pairsMatched: 8,
          moves,
          timeSpent,
          completed: true,
          won: true,
        }),
      });

      if (response.ok) {
        // Refresh data to show completion status
        fetchFlipData();
      }
    } catch (error) {
      console.error('Error completing flip game:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600">Loading Memory Match...</p>
      </div>
    );
  }

  if (!flipData?.game) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="text-4xl sm:text-6xl mb-4">🃏</div>
        <p className="text-sm sm:text-base text-gray-600 mb-2">
          No Memory Match game available right now
        </p>
        <p className="text-xs sm:text-sm text-gray-400">
          Check back later or try other activities!
        </p>
      </div>
    );
  }

  // Check if already completed
  if (flipData.attempt?.completed) {
    return (
      <div className="text-center py-6 sm:py-8 space-y-4">
        <div className="text-4xl sm:text-6xl mb-4">✅</div>
        <p className="text-sm sm:text-base text-green-600 font-semibold mb-2">
          {flipData.attempt.won ? 'Game Completed!' : 'Game Finished'}
        </p>
        <p className="text-xs sm:text-sm text-gray-600">
          {flipData.attempt.won 
            ? `You earned ${flipData.attempt.points} points!` 
            : 'Better luck next time!'}
        </p>
        <p className="text-xs text-gray-400">
          Check back for the next game!
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-4xl sm:text-6xl">🃏</div>
      <p className="text-sm sm:text-base text-gray-600 break-words">
        Match verse pairs from{' '}
        <span className="font-semibold">
          {flipData.game.bookName} {flipData.game.fromChapter}:{flipData.game.fromVerse}-
          {flipData.game.toChapter}:{flipData.game.toVerse}
        </span>
      </p>
      
      <Button 
        onClick={() => setModalOpen(true)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Play className="mr-2 h-4 w-4" />
        Play Memory Match
      </Button>

      <FlipGameModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onComplete={handleFlipComplete}
        gameId={flipData.game.id}
        gameData={flipData.game}
      />
    </div>
  );
}
