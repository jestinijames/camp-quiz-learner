/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { WordleGameModal } from './WordleGameModal';

interface WordleData {
  available: boolean;
  wordle?: {
    id: number;
    title: string;
    hint: string;
    book: string;
  };
  message?: string;
}

export function DailyWordleSection() {
  const [wordleData, setWordleData] = useState<WordleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWordleData();
  }, []);

  const fetchWordleData = async () => {
    try {
      const response = await fetch('/api/wordle/available');
      if (response.ok) {
        const data = await response.json();
        setWordleData(data);
      }
    } catch (error) {
      console.error('Error fetching wordle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWordleComplete = (result: any) => {
    console.log('Wordle completed:', result);
    // Refresh to check for new wordles
    fetchWordleData();
  };

  if (loading) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600">Loading today&apos;s Wordle...</p>
      </div>
    );
  }

  if (!wordleData?.available) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="text-4xl sm:text-6xl mb-4">🔤</div>
        <p className="text-sm sm:text-base text-gray-600 mb-2">
          {wordleData?.message || 'No Wordle available right now'}
        </p>
        <p className="text-xs sm:text-sm text-gray-400">
          Check back later or try completing available quizzes!
        </p>
      </div>
    );
  }

  if (!wordleData.wordle) {
    return (
      <div className="text-center py-6 sm:py-8">
        <p className="text-red-500">Error: Wordle data unavailable</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-4xl sm:text-6xl">🔤</div>
      <p className="text-sm sm:text-base text-gray-600 break-words">
        Guess today&apos;s 5-letter Biblical word from <span className="font-semibold">{wordleData.wordle.book}</span>
      </p>
      
      <WordleGameModal
        wordle={wordleData.wordle}
        onComplete={handleWordleComplete}
      />
    </div>
  );
}