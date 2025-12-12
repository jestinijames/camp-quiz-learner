/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/emoji/[gameId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

type EmojiPuzzle = {
  emojis: string;
  verse: string;
  hint?: string;
};

export default function EmojiGamePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [game, setGame] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [puzzle, setPuzzle] = useState<EmojiPuzzle | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!user || user.isAdmin) {
      router.push('/');
      return;
    }

    const startGame = async () => {
      try {
        const response = await fetch(`/api/emoji/${gameId}/start`, {
          method: 'POST'
        });

        if (response.ok) {
          const data = await response.json();
          setGame(data.game);
          setAttempt(data.attempt);
          
          // Parse the assigned emoji puzzle
          const assignedPuzzle = JSON.parse(data.attempt.assignedEmoji);
          setPuzzle(assignedPuzzle);
          
          // If already completed, show result
          if (data.attempt.completed) {
            setResult({
              isCorrect: data.attempt.isCorrect,
              points: data.attempt.points,
              correctAnswer: assignedPuzzle.verse,
              assignedEmoji: assignedPuzzle
            });
            setAnswer(data.attempt.answer || '');
          }
        } else {
          const error = await response.json();
          setError(error.error || 'Failed to start game');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    startGame();
  }, [user, gameId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answer.trim()) {
      setError('Please enter your answer');
      return;
    }

    // Validate format
    const formatRegex = /^\d+:\d+$/;
    if (!formatRegex.test(answer.trim())) {
      setError('Invalid format. Use chapter:verse (e.g., 3:16)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      const response = await fetch(`/api/emoji/${gameId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim(), timeSpent })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setAttempt(data.attempt);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to submit answer');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading emoji game...</p>
        </div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        {/* Header */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
            <CardTitle className="flex items-center gap-3">
              <span className="text-3xl">📱</span>
              <div>
                <h1 className="text-xl font-bold">{game?.title}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                  {game?.bookName} Emoji Challenge
                </p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Game Hint */}
        {game?.hint && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm">
              💡 <strong>Hint:</strong> {game.hint}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Game Card */}
        <Card className="border-2 border-purple-300 dark:border-purple-700 shadow-xl">
          <CardContent className="pt-8 pb-8 px-6">
            {!result ? (
              // Playing
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Emoji Display */}
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Which verse do these emojis represent?
                  </p>
                  <div className="text-7xl leading-relaxed py-6 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                    {puzzle?.emojis}
                  </div>
                  {puzzle?.hint && (
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      💭 {puzzle.hint}
                    </p>
                  )}
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Your Answer (chapter:verse):
                  </label>
                  <Input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g., 3:16 or 2:8"
                    className="text-lg text-center font-mono"
                    disabled={submitting}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Format: chapter:verse (no spaces)
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-lg py-6"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Checking...
                    </span>
                  ) : (
                    '✓ Submit Answer'
                  )}
                </Button>
              </form>
            ) : (
              // Result Display
              <div className="space-y-6 text-center">
                {/* Result Icon */}
                <div className="text-8xl">
                  {result.isCorrect ? '🎉' : '😔'}
                </div>

                {/* Result Message */}
                <div>
                  <h2 className={`text-3xl font-bold mb-2 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isCorrect ? 'Correct!' : 'Not Quite'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {result.isCorrect 
                      ? 'Amazing! You identified the verse correctly!' 
                      : 'Keep studying - you\'ll get it next time!'}
                  </p>
                </div>

                {/* Emoji Reminder */}
                <div className="text-5xl py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {result.assignedEmoji.emojis}
                </div>

                {/* Answer Comparison */}
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Answer:</p>
                    <p className="text-2xl font-mono font-bold">{answer}</p>
                  </div>
                  {!result.isCorrect && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Correct Answer:</p>
                      <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                        {result.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>

                {/* Points */}
                <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Points Earned</p>
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {result.points} pts
                  </p>
                </div>

                {/* Verse Hint */}
                {result.assignedEmoji.hint && (
                  <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-left">
                    <AlertDescription className="text-sm">
                      <strong>About this verse:</strong> {result.assignedEmoji.hint}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => router.push('/')}
                  className="w-full text-lg py-6"
                  variant="outline"
                >
                  🏠 Return Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions (only show when playing) */}
        {!result && (
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>📖 How to Play:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Study the emojis carefully</li>
                <li>Think about what verse from <strong>{game?.bookName}</strong> they represent</li>
                <li>Enter your answer as <code className="bg-white dark:bg-gray-800 px-1 rounded">chapter:verse</code></li>
                <li>Get 2 points for a correct answer!</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}