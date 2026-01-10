'use client';

import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type EmojiReview = {
  attemptId: number;
  gameTitle: string;
  assignedEmoji: {
    emojis: string;
    verse: string;
    hint?: string;
  };
  userAnswer: string | null;
  isCorrect: boolean;
  points: number;
  completedAt: string;
  verseReference: {
    book: string;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
  };
};

type User = {
  isAdmin: boolean;
};

interface EmojiReviewSectionProps {
  user: User | null;
}

export function EmojiReviewSection({ user }: EmojiReviewSectionProps) {
  const [reviews, setReviews] = useState<EmojiReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState<{ [key: number]: boolean }>({ 0: true });

  useEffect(() => {
    const fetchReview = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/emoji-review');
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error('Failed to load emoji review:', error);
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
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading your emoji review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          📱 Your Emoji Verse Review
        </h2>
        <p className="text-sm sm:text-base text-purple-100 mt-1">
          {reviews.length} emoji game{reviews.length !== 1 ? 's' : ''} completed
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
            {/* Emoji Game Header */}
            <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl sm:text-2xl">{review.isCorrect ? '🎉' : '📝'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    {review.gameTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                      {review.isCorrect ? '✓ Correct' : '× Incorrect'}
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
                {/* The Emoji Section */}
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span>🎭</span> Your Emoji Puzzle
                  </h4>
                  <div className="text-center">
                    <div className="text-5xl py-4 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                      {review.assignedEmoji.emojis}
                    </div>
                    {review.assignedEmoji.hint && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        <span className="font-semibold">Hint:</span> {review.assignedEmoji.hint}
                      </p>
                    )}
                  </div>
                </div>

                {/* Answers Section */}
                <div className="space-y-2">
                  {/* Your Answer */}
                  <div className={`border rounded-lg p-3 ${
                    review.isCorrect 
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10'
                  }`}>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <span>📝</span> Your Answer
                    </h4>
                    <p className={`text-xl font-mono font-bold text-center ${
                      review.isCorrect 
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {review.userAnswer || 'No answer submitted'}
                    </p>
                  </div>

                  {/* Correct Answer (if wrong) */}
                  {!review.isCorrect && (
                    <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-900/10">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <span>✓</span> Correct Answer
                      </h4>
                      <p className="text-xl font-mono font-bold text-center text-green-700 dark:text-green-300">
                        {review.assignedEmoji.verse}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bible Reference Section */}
                <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>📖</span> Bible Reference
                  </h4>
                  <p className="text-base font-semibold text-blue-700 dark:text-blue-300">
                    {review.verseReference.book} {review.verseReference.fromChapter}:{review.verseReference.fromVerse}
                    {(review.verseReference.fromChapter !== review.verseReference.toChapter || 
                      review.verseReference.fromVerse !== review.verseReference.toVerse) && (
                      <> - {review.verseReference.toChapter}:{review.verseReference.toVerse}</>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    The verse is from this passage
                  </p>
                </div>

                {/* Performance Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Points Earned:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{review.points} points</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-center text-gray-700 dark:text-gray-300">
          💪 <strong>Keep Learning:</strong> Review the emoji puzzles and their verse references to improve!
        </p>
      </div>
    </div>
  );
}
