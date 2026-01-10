/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface WordleGameModalProps {
  wordle: {
    id: number;
    title: string;
    hint: string;
    book: string;
  };
  onComplete: (result: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface GuessFeedback {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export function WordleGameModal({ wordle, onComplete, isOpen: externalIsOpen, onClose: externalOnClose }: WordleGameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessFeedback, setGuessFeedback] = useState<GuessFeedback[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [actualWord, setActualWord] = useState('');
  const [verseReference, setVerseReference] = useState<any>(null);
  const [usedLetters, setUsedLetters] = useState<{[key: string]: 'correct' | 'present' | 'absent'}>({});
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes = 240 seconds

  const maxAttempts = 6;
  const GAME_TIME_LIMIT = 240; // 4 minutes

  // Use external isOpen if provided, otherwise use internal
  const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setModalOpen = useMemo(() => externalOnClose ? (open: boolean) => {
    if (!open) externalOnClose();
  } : setIsOpen, [externalOnClose]);

  // Auto-start game when modal opens from external control
  const shouldStart = externalIsOpen && !hasStarted;
  
  useEffect(() => {
    if (!shouldStart) return;
    
    const timer = setTimeout(() => {
      setHasStarted(true);
      setGuesses([]);
      setGuessFeedback([]);
      setCurrentGuess('');
      setGameOver(false);
      setWon(false);
      setSubmitting(false);
      setActualWord('');
      setUsedLetters({});
      setStartTime(Date.now());
      setTimeLeft(GAME_TIME_LIMIT);
    }, 0);
    
    return () => clearTimeout(timer);
  }, [shouldStart, GAME_TIME_LIMIT]);

  // Check individual guess and get feedback
  const checkGuess = useCallback(async (guess: string) => {
    try {
      const response = await fetch(`/api/wordle/${wordle.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess })
      });

      if (response.ok) {
        const data = await response.json();
        return data; // { isCorrect, feedback, word }
      }
    } catch (error) {
      console.error('Error checking guess:', error);
    }
    return null;
  }, [wordle.id]);

  const submitGame = useCallback(async (gameWon: boolean, finalGuesses: string[]) => {
    setSubmitting(true);
    
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      const response = await fetch(`/api/wordle/${wordle.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesses: finalGuesses,
          won: gameWon,
          timeSpent
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setActualWord(data.result.correctWord);
        setVerseReference(data.result.verseReference);
        onComplete(data.result);
        
        // Close modal after showing result for a moment
        setTimeout(() => {
          setModalOpen(false);
        }, 3000);
      } else {
        toast.error('Error submitting game: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting Wordle:', error);
      toast.error('Error submitting game: ' + error);
    }
    
    setSubmitting(false);
  }, [wordle.id, startTime, onComplete, setModalOpen]);

  // Handle modal close with auto-submit
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && hasStarted && !gameOver && !submitting) {
      // Game is being closed without completion - submit current state
      submitGame(false, guesses);
    } else {
      setModalOpen(open);
    }
  }, [hasStarted, gameOver, submitting, guesses, submitGame, setModalOpen]);

  const makeGuess = useCallback(async () => {
    if (currentGuess.length !== 5 || gameOver || submitting) return;
    
    const guess = currentGuess.toUpperCase();
    
    // Check this guess with the server
    const result = await checkGuess(guess);
    if (!result) return;
    
    const newGuesses = [...guesses, guess];
    const newFeedback = [...guessFeedback, result.feedback];
    
    setGuesses(newGuesses);
    setGuessFeedback(newFeedback);
    setCurrentGuess('');
    
    // Update keyboard letters
    const newUsedLetters = { ...usedLetters };
    result.feedback.forEach((fb: GuessFeedback) => {
      const currentStatus = newUsedLetters[fb.letter];
      // Only update if it's better status (correct > present > absent)
      if (!currentStatus || 
          (fb.status === 'correct') ||
          (fb.status === 'present' && currentStatus === 'absent')) {
        newUsedLetters[fb.letter] = fb.status;
      }
    });
    setUsedLetters(newUsedLetters);

    // Check if won
    if (result.isCorrect) {
      setWon(true);
      setGameOver(true);
      setActualWord(result.word);
      submitGame(true, newGuesses);
      return;
    }

    // Check if max attempts reached
    if (newGuesses.length >= maxAttempts) {
      setGameOver(true);
      setWon(false);
      submitGame(false, newGuesses);
    }
  }, [currentGuess, gameOver, guesses, guessFeedback, maxAttempts, submitGame, submitting, checkGuess, usedLetters]);

  const addLetter = useCallback((letter: string) => {
    if (currentGuess.length < 5 && !gameOver && !submitting) {
      setCurrentGuess(prev => prev + letter);
    }
  }, [currentGuess.length, gameOver, submitting]);

  const removeLetter = useCallback(() => {
    if (!gameOver && !submitting) {
      setCurrentGuess(prev => prev.slice(0, -1));
    }
  }, [gameOver, submitting]);

  // Keyboard event handling
  useEffect(() => {
    if (!modalIsOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (submitting || gameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        makeGuess();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        removeLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        addLetter(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [modalIsOpen, makeGuess, removeLetter, addLetter, submitting, gameOver]);

  // Timer countdown
  useEffect(() => {
    if (!modalIsOpen || gameOver || submitting) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up!
          setGameOver(true);
          setWon(false);
          submitGame(false, guesses);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [modalIsOpen, gameOver, submitting, guesses, submitGame]);

  // Get letter style based on feedback
  const getLetterStyle = (letter: string, position: number, guessIndex: number) => {
    const feedback = guessFeedback[guessIndex];
    if (!feedback || !feedback[position]) {
      return 'bg-white border-gray-300 text-gray-800';
    }

    const status = feedback[position].status;
    switch (status) {
      case 'correct':
        return 'bg-green-500 text-white border-green-500';
      case 'present':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'absent':
        return 'bg-gray-500 text-white border-gray-500';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getKeyboardLetterStyle = (letter: string) => {
    const status = usedLetters[letter];
    switch (status) {
      case 'correct':
        return 'bg-green-500 text-white border-green-500';
      case 'present':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'absent':
        return 'bg-gray-500 text-white border-gray-500';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300';
    }
  };

  const dialogContent = (
    <DialogContent className="w-[95vw] max-w-sm mx-auto max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg font-bold wrap-break-word">
            {wordle.title}
          </DialogTitle>
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-600 wrap-break-word">{wordle.hint}</p>
            <p className="text-xs text-blue-600">From {wordle.book}</p>
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 items-center">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                Guess #{guesses.length + 1}/6
              </Badge>
              {!gameOver && (
                <Badge 
                  variant={timeLeft <= 30 ? "destructive" : "secondary"}
                  className={`text-xs sm:text-sm font-mono px-2 py-0.5 ${timeLeft <= 30 ? 'animate-pulse' : ''}`}
                >
                  ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-1">
          {/* Game Instructions */}
          {guesses.length === 0 && !gameOver && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="font-semibold text-blue-800 mb-1">How to Play:</p>
              <p className="text-blue-700">Guess the 5-letter word. You have 6 attempts!</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded"></div>
                  Correct
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded"></div>
                  Wrong spot
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-gray-500 rounded"></div>
                  Not in word
                </span>
              </div>
            </div>
          )}

          {/* 6x5 Grid - Smaller for mobile */}
          <div className="grid grid-rows-6 gap-1 justify-center">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-1 justify-center">
                {Array.from({ length: 5 }).map((_, colIndex) => {
                  let letter = '';
                  let extraStyle = '';

                  if (guesses[rowIndex]) {
                    // Completed guess row with feedback
                    letter = guesses[rowIndex][colIndex] || '';
                    extraStyle = getLetterStyle(letter, colIndex, rowIndex);
                  } else if (rowIndex === guesses.length && !gameOver) {
                    // Current guess row - show letters as they type
                    letter = currentGuess[colIndex] || '';
                    extraStyle = letter 
                      ? 'border-blue-400 bg-blue-50 text-blue-800 font-bold' 
                      : 'border-gray-300 bg-white';
                  } else {
                    // Empty rows
                    extraStyle = 'border-gray-300 bg-white';
                  }

                  return (
                    <div
                      key={colIndex}
                      className={`w-8 h-8 border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${extraStyle}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Virtual Keyboard - Much smaller for mobile */}
          {!gameOver && (
            <div className="space-y-1">
              {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-0.5">
                  {rowIndex === 2 && (
                    <Button
                      onClick={makeGuess}
                      disabled={currentGuess.length !== 5 || submitting}
                      variant="outline"
                      className="px-1 py-1 text-xs font-medium h-7 text-[10px]"
                    >
                      ENTER
                    </Button>
                  )}
                  
                  {row.map((letter) => (
                    <Button
                      key={letter}
                      onClick={() => addLetter(letter)}
                      disabled={submitting}
                      variant="outline"
                      className={`w-6 h-7 text-xs font-bold transition-all duration-200 p-0 ${getKeyboardLetterStyle(letter)}`}
                    >
                      {letter}
                    </Button>
                  ))}
                  
                  {rowIndex === 2 && (
                    <Button
                      onClick={removeLetter}
                      disabled={submitting}
                      variant="outline"
                      className="px-1 py-1 text-xs font-medium h-7 text-[10px]"
                    >
                      ⌫
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Current Word Display */}
          {!gameOver && (
            <div className="text-center">
              <div className="text-sm font-bold tracking-wider text-blue-600 min-h-5">
                {currentGuess.padEnd(5, '_').split('').join(' ')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Type letters and press ENTER to guess
              </p>
            </div>
          )}

          {/* Game Over State */}
          {gameOver && (
            <div className="text-center space-y-2">
              {submitting ? (
                <div className="text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-xs">🔄 Submitting your game...</p>
                </div>
              ) : actualWord ? (
                <div className={`p-3 rounded-lg border-2 ${won ? "border-green-400 bg-green-50" : "border-orange-400 bg-orange-50"}`}>
                  {won ? (
                    <div className="text-green-600">
                      <p className="text-base mb-1">🎉 Congratulations!</p>
                      <p className="font-bold text-xs">You got it in {guesses.length} attempts!</p>
                      <p className="text-sm font-bold tracking-wider mt-1 text-green-800">{actualWord}</p>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      <p className="text-base mb-1">😊 Good try!</p>
                      <p className="text-xs">The word was:</p>
                      <p className="text-base font-bold tracking-wider mt-1 text-orange-800">{actualWord}</p>
                    </div>
                  )}
                  <p className="text-xs mt-2 text-gray-600">
                    Modal will close automatically...
                  </p>
                </div>
              ) : (
                <div className="text-blue-600">
                  <p className="text-xs">Game completed! Processing results...</p>
                </div>
              )}
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
          className="w-full bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 sm:px-6 rounded-lg shadow-lg transform transition hover:scale-105"
        >
          🎯 Play Bible Wordle
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}