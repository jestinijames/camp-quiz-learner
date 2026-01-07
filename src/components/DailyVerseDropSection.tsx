/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { VerseDropGameModal } from './VerseDropGameModal';
import { Button } from './ui/button';
import { Droplets } from 'lucide-react';

interface VerseDropData {
  available: boolean;
  game?: {
    id: number;
    title: string;
    book: string;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
    timeLimit: number;
  };
  message?: string;
}

export function DailyVerseDropSection() {
  const [verseDropData, setVerseDropData] = useState<VerseDropData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVerseDropData();
  }, []);

  const fetchVerseDropData = async () => {
    try {
      const response = await fetch('/api/verse-drop/available');
      if (response.ok) {
        const data = await response.json();
        setVerseDropData(data);
      }
    } catch (error) {
      console.error('Error fetching verse drop:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerseDropComplete = (result: any) => {
    console.log('Verse Drop completed:', result);
    // Refresh to check for new games
    fetchVerseDropData();
  };

  if (loading) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm sm:text-base text-gray-600">Loading today&apos;s Verse Drop...</p>
      </div>
    );
  }

  if (!verseDropData?.available) {
    return (
      <div className="text-center py-6 sm:py-8">
        <div className="text-4xl sm:text-6xl mb-4">💧</div>
        <p className="text-sm sm:text-base text-gray-600 mb-2">
          {verseDropData?.message || 'No Verse Drop available right now'}
        </p>
        <p className="text-xs sm:text-sm text-gray-400">
          Check back later for more word-catching fun!
        </p>
      </div>
    );
  }

  if (!verseDropData.game) {
    return (
      <div className="text-center py-6 sm:py-8">
        <p className="text-red-500">Error: Verse Drop data unavailable</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center space-y-4">
        <div className="text-4xl sm:text-6xl">💧</div>
        <p className="text-sm sm:text-base text-gray-600 break-words">
          Catch the falling words to complete a verse from{' '}
          <span className="font-semibold">
            {verseDropData.game.book} {verseDropData.game.fromChapter}:{verseDropData.game.fromVerse}
            {verseDropData.game.toChapter !== verseDropData.game.fromChapter && 
              `-${verseDropData.game.toChapter}:${verseDropData.game.toVerse}`}
          </span>
        </p>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Droplets className="h-4 w-4 mr-2" />
          Play Verse Drop
        </Button>
      </div>

      {isModalOpen && (
        <VerseDropGameModal
          game={verseDropData.game}
          onComplete={handleVerseDropComplete}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
