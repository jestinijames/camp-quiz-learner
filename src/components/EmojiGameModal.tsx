// src/components/EmojiGameModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

interface EmojiGameModalProps {
  game: {
    id: number;
    title: string;
    bookName: string;
    passage: string;
    hint?: string;
  };
  onComplete: (result: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

type EmojiPuzzle = {
  emojis: string;
  verse: string;
  hint?: string;
};

export function EmojiGameModal({ game, onComplete, isOpen: externalIsOpen, onClose: externalOnClose }: EmojiGameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<EmojiPuzzle | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes = 240 seconds
  const [timerExpired, setTimerExpired] = useState(false);

  const GAME_TIME_LIMIT = 240; // 4 minutes

  // Use external isOpen if provided, otherwise use internal
  const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setModalOpen = externalOnClose ? (open: boolean) => {
    if (!open) externalOnClose();
  } : setIsOpen;

  // Auto-start game when modal opens from external control
  useEffect(() => {
    if (externalIsOpen && !hasStarted) {
      handleStartGame();
    }
  }, [externalIsOpen]);

  // Timer countdown effect
  useEffect(() => {
    if (!modalIsOpen || result || submitting || loading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, result, submitting, loading, timeLeft]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timerExpired && !result && !submitting && puzzle) {
      handleAutoSubmit();
    }
  }, [timerExpired, result, submitting, puzzle]);

  const handleAutoSubmit = async () => {
    if (!puzzle) return;
    
    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      const response = await fetch(`/api/emoji/${game.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answer: answer.trim() || '0:0', // Submit empty/invalid answer if time ran out
          timeSpent 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        onComplete(data);

        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Auto-submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Start game when modal opens
  const handleStartGame = async () => {
    setHasStarted(true);
    setLoading(true);
    setPuzzle(null);
    setAnswer('');
    setResult(null);
    setError('');
    setStartTime(Date.now());
    setTimeLeft(GAME_TIME_LIMIT);
    setTimerExpired(false);

    try {
      const response = await fetch(`/api/emoji/${game.id}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setAttemptId(data.attempt.id);
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

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
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
      
      const response = await fetch(`/api/emoji/${game.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim(), timeSpent })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        onComplete(data);

        // Close modal after 3 seconds
        setTimeout(() => {
          setModalOpen(false);
        }, 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to submit answer');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }, [answer, startTime, game.id, onComplete, setModalOpen]);

  // Handle modal close with auto-submit
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && attemptId && hasStarted && !result && !submitting && puzzle) {
      // Game is being closed with active attempt - submit with current answer or empty
      const submitAnswer = async () => {
        setSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        try {
          await fetch(`/api/emoji/${game.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              answer: answer.trim() || '0:0', // Submit empty/invalid answer if closed
              timeSpent 
            })
          });
        } catch (error) {
          console.error('Auto-submit on close error:', error);
        } finally {
          setSubmitting(false);
          setModalOpen(false);
        }
      };
      submitAnswer();
    } else {
      setModalOpen(open);
    }
  }, [attemptId, hasStarted, result, submitting, puzzle, answer, startTime, game.id, setModalOpen]);

  const dialogContent = (
    <DialogContent className="w-[95vw] max-w-sm mx-auto max-h-[95vh] overflow-y-auto p-4">
      <DialogHeader>
        <DialogTitle className="text-center text-base sm:text-lg font-bold">
          {game.title}
        </DialogTitle>
        <div className="text-center space-y-1.5">
          <p className="text-xs text-gray-600">{game.bookName} {game.passage}</p>
          {!result && !loading && (
            <div className="flex justify-center">
              <Badge 
                variant={timeLeft <= 30 ? "destructive" : "secondary"}
                className={`text-xs sm:text-sm font-mono px-3 py-1 ${timeLeft <= 30 ? 'animate-pulse' : ''}`}
              >
                ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 px-1">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading puzzle...</p>
            </div>
          ) : error && !puzzle ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !result ? (
            // Playing State
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Instructions */}
              <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                <p className="font-semibold text-purple-800 mb-1">How to Play:</p>
                <p className="text-purple-700">
                  Identify which verse these emojis represent!
                </p>
              </div>

              {/* Emoji Display */}
              <div className="text-center space-y-3">
                {/* <p className="text-xs text-gray-600 font-medium">
                  Which verse do these emojis represent?
                </p> */}
                <div className="text-6xl leading-relaxed py-6 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                  {puzzle?.emojis}
                </div>
                {/* {puzzle?.hint && (
                  <p className="text-xs text-purple-600">
                    💭 {puzzle.hint}
                  </p>
                )} */}
              </div>

              {/* Answer Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Your Answer (chapter:verse):
                </label>
                <Input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g., 3:16 or 2:8"
                  className="text-center font-mono text-lg"
                  disabled={submitting}
                  autoFocus
                />
                <p className="text-xs text-gray-500 text-center">
                  Format: chapter:verse (no spaces)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-5"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Checking...
                  </span>
                ) : (
                  '✓ Submit Answer'
                )}
              </Button>
            </form>
          ) : (
            // Result Display
            <div className="space-y-4 text-center">
              <div className="text-6xl">
                {result.isCorrect ? '🎉' : '😔'}
              </div>

              <div>
                <h2 className={`text-2xl font-bold mb-2 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {result.isCorrect ? 'Correct!' : 'Not Quite'}
                </h2>
                <p className="text-xs text-gray-600">
                  {result.isCorrect 
                    ? 'Amazing! You identified the verse!' 
                    : 'Keep studying - you\'ll get it next time!'}
                </p>
              </div>

              {/* Emoji */}
              <div className="text-4xl py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {result.assignedEmoji.emojis}
              </div>

              {/* Answers */}
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Your Answer:</p>
                  <p className="text-xl font-mono font-bold">{answer}</p>
                </div>
                {!result.isCorrect && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Correct Answer:</p>
                    <p className="text-xl font-mono font-bold text-green-600">
                      {result.correctAnswer}
                    </p>
                  </div>
                )}
              </div>

              {/* Points */}
              <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Points Earned</p>
                <p className="text-3xl font-bold text-purple-600">
                  {result.points} pts
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Modal will close automatically...
              </p>
            </div>
          )}
        </div>
    </DialogContent>
  );

  // If controlled externally, don't show the trigger button
  if (externalIsOpen !== undefined) {
    return (
      <Dialog open={modalIsOpen} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Original version with trigger button
  return (
    <Dialog open={modalIsOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleStartGame}
          className="w-full bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-4 sm:px-6 rounded-lg shadow-lg transform transition hover:scale-105"
        >
          📱 Play Emoji Verse Game
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}