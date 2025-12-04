/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { WordleGameModal } from './WordleGameModal';

interface WordleData {
  id: number;
  title: string;
  hint: string;
  book: string;
}

interface GameResult {
  won: boolean;
  attempts: number;
  points: number;
  correctWord: string;
  message: string;
}

export function DailyWordleSection() {
  const [wordle, setWordle] = useState<WordleData | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Create the effect that calls the async function
  useEffect(() => {
    const fetchAvailableWordle = async () => {
      try {
        const response = await fetch('/api/wordle/available');
        const data = await response.json();
        
        if (response.ok) {
          setWordle(data.wordle);
          setHasPlayed(data.hasPlayed || false);
        } else {
          console.error('Error fetching Wordle:', data.error);
        }
      } catch (error) {
        console.error('Error fetching Wordle:', error);
      }
      setLoading(false);
    };

    // Call the function inside the effect
    fetchAvailableWordle();
  }, []); // Empty dependency array - only run once on mount

  const handleGameComplete = (result: GameResult) => {
    setGameResult(result);
    setHasPlayed(true);
    setWordle(null);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading today&apos;s Bible Wordle...</p>
      </div>
    );
  }

  if (hasPlayed && gameResult) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🎯 Today&apos;s Wordle Complete!
          </h3>
          <p className="text-green-700 mb-2">{gameResult.message}</p>
          <div className="text-sm text-green-600">
            <p>Points Earned: <strong>{gameResult.points}</strong></p>
            {gameResult.won && <p>Attempts: <strong>{gameResult.attempts}/6</strong></p>}
          </div>
        </div>
        <p className="text-gray-500">Come back tomorrow for a new Bible Wordle!</p>
      </div>
    );
  }

  if (hasPlayed && !gameResult) {
    return (
      <div className="text-center py-8">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">✅ Already Played Today</h3>
          <p className="text-blue-700">You&apos;ve already completed today&apos;s Bible Wordle!</p>
          <p className="text-blue-600 text-sm mt-2">Check back tomorrow for a new word challenge.</p>
        </div>
      </div>
    );
  }

  if (!wordle) {
    return (
      <div className="text-center py-8">
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">📝 No Wordle Available</h3>
          <p className="text-gray-600">Check back later for today&apos;s Bible Wordle!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready for today&apos;s challenge?</h3>
        <p className="text-sm text-gray-600">{wordle.hint}</p>
        <p className="text-xs text-blue-600">From the Book of {wordle.book}</p>
      </div>
      <WordleGameModal 
        wordle={wordle} 
        onComplete={handleGameComplete}
      />
    </div>
  );
}