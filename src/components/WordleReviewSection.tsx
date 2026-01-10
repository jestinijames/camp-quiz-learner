'use client';

import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type WordleReview = {
  attemptId: number;
  wordleTitle: string;
  assignedWord: string;
  won: boolean;
  attempts: number;
  points: number;
  completedAt: string;
  verseReference: {
    book: string;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
  };
  hint: string | null;
};

type User = {
  isAdmin: boolean;
};

interface WordleReviewSectionProps {
  user: User | null;
}

export function WordleReviewSection({ user }: WordleReviewSectionProps) {
  const [reviews, setReviews] = useState<WordleReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState<{ [key: number]: boolean }>({ 0: true });

  useEffect(() => {
    const fetchReview = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/wordle-review');
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error('Failed to load wordle review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [user]);

  if (!user || user.isAdmin || reviews.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading your wordle review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          🎯 Your Bible Wordle Review
        </h2>
        <p className="text-sm sm:text-base text-blue-100 mt-1">
          {reviews.length} wordle{reviews.length !== 1 ? 's' : ''} completed
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {reviews.map((review, attemptIndex) => (
          <Collapsible
            key={review.attemptId}
            open={expandedAttempts[attemptIndex]}
            onOpenChange={(open) => setExpandedAttempts(prev => ({ ...prev, [attemptIndex]: open }))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
          >
            {/* Wordle Header */}
            <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl sm:text-2xl">{review.won ? '🎉' : '📝'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    {review.wordleTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {review.won ? `✓ Won in ${review.attempts} attempts` : '× Not solved'}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      {review.points} pts
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-gray-400 dark:text-gray-500 ml-2 shrink-0 text-lg">
                {expandedAttempts[attemptIndex] ? '▲' : '▼'}
              </span>
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t border-gray-200 dark:border-gray-700">
              <div className="p-4 space-y-4">
                {/* The Word Section */}
                <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>💡</span> Your Assigned Word
                  </h4>
                  <p className="text-2xl font-bold text-center text-green-700 dark:text-green-300 tracking-wider py-2">
                    {review.assignedWord}
                  </p>
                  {review.hint && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-semibold">Hint:</span> {review.hint}
                    </p>
                  )}
                </div>

                {/* Bible Reference Section */}
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>📖</span> Bible Reference
                  </h4>
                  <p className="text-base font-semibold text-purple-700 dark:text-purple-300">
                    {review.verseReference.book} {review.verseReference.fromChapter}:{review.verseReference.fromVerse}
                    {(review.verseReference.fromChapter !== review.verseReference.toChapter || 
                      review.verseReference.fromVerse !== review.verseReference.toVerse) && (
                      <> - {review.verseReference.toChapter}:{review.verseReference.toVerse}</>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    This word appeared in this passage
                  </p>
                </div>

                {/* Performance Section */}
                <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>📊</span> Your Performance
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Result:</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {review.won ? `Won in ${review.attempts} tries` : 'Did not solve'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Points Earned:</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100">{review.points} points</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-center text-gray-700 dark:text-gray-300">
          💪 <strong>Keep Learning:</strong> Review the words and their Bible references to strengthen your knowledge!
        </p>
      </div>
    </div>
  );
}
