// src/components/EmojiGameModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { useGameState } from '@/contexts/GameStateContext';

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
  const { getEmojiState, setEmojiState } = useGameState();
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
  const [isPaused, setIsPaused] = useState(false);
  
  // Use ref to track if we've initialized on this mount
  const hasInitialized = useRef(false);

  const GAME_TIME_LIMIT = 240; // 4 minutes

  // Use external isOpen if provided, otherwise use internal
  const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setModalOpen = externalOnClose ? (open: boolean) => {
    if (!open) externalOnClose();
  } : setIsOpen;

  // Start game when modal opens
  const handleStartGame = useCallback(async () => {
    console.log('Starting new emoji game');
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
  }, [game.id]);

  // Load persisted state when modal opens or start new game
  useEffect(() => {
    if (!modalIsOpen) {
      // Reset initialization flag when modal closes
      hasInitialized.current = false;
      return;
    }
    
    // Don't initialize twice
    if (hasInitialized.current) return;

    const savedState = getEmojiState(game.id);
    
    if (savedState && savedState.hasStarted) {
      // Restore saved state - NO API CALL
      console.log('Restoring emoji game state from context:', savedState);
      
      // Calculate actual time remaining based on elapsed time
      const elapsed = Math.floor((Date.now() - savedState.startTime) / 1000);
      const remaining = Math.max(0, GAME_TIME_LIMIT - elapsed);
      
      setHasStarted(true);
      setAttemptId(savedState.attemptId);
      setPuzzle(savedState.puzzle);
      setAnswer(savedState.answer);
      setStartTime(savedState.startTime);
      setTimeLeft(remaining);
      setIsPaused(false);
      setLoading(false);
      setTimerExpired(remaining === 0);
      hasInitialized.current = true;
    } else {
      // No saved state - Start new game with API call
      console.log('No saved state found, making API call to start new game');
      hasInitialized.current = true;
      handleStartGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalIsOpen, game.id]);

  // Save state when modal closes - NO PAUSING, timer keeps running in background
  useEffect(() => {
    if (!modalIsOpen && hasStarted && !result && attemptId) {
      // Save current state but DON'T pause timer
      setEmojiState(game.id, {
        gameId: game.id,
        hasStarted,
        attemptId,
        puzzle,
        answer,
        startTime, // Keep original start time
        timeLeft, // Current time left (will be recalculated on reopen)
        pausedAt: Date.now()
      });
    }
  }, [modalIsOpen, hasStarted, result, attemptId, game.id, puzzle, answer, startTime, timeLeft, setEmojiState]);

  // Timer countdown effect - runs continuously based on elapsed time
  useEffect(() => {
    if (!modalIsOpen || result || submitting || loading) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, GAME_TIME_LIMIT - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining === 0 && !timerExpired) {
        setTimerExpired(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [modalIsOpen, result, submitting, loading, startTime, timerExpired]);

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
        
        // Clear saved state after successful submission
        setEmojiState(game.id, null);
        
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
  }, [answer, startTime, game.id, onComplete, setModalOpen, setEmojiState]);

  // Handle modal close - no auto-submit, just save state
  const handleOpenChange = useCallback((open: boolean) => {
    setModalOpen(open);
  }, [setModalOpen]);

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

              {/* Verse Reference */}
              {result.verseReference && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">📖 Bible Reference:</p>
                  <p className="text-base font-semibold text-purple-700">
                    {result.verseReference.book} {result.verseReference.fromChapter}:{result.verseReference.fromVerse}
                    {(result.verseReference.fromChapter !== result.verseReference.toChapter || 
                      result.verseReference.fromVerse !== result.verseReference.toVerse) && (
                      <> - {result.verseReference.toChapter}:{result.verseReference.toVerse}</>
                    )}
                  </p>
                </div>
              )}

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
          className="w-full bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-4 sm:px-6 rounded-lg shadow-lg transform transition hover:scale-105"
        >
          📱 Play Emoji Verse Game
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}