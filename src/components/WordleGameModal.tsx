/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
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

export function WordleGameModal({ wordle, onComplete }: WordleGameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessFeedback, setGuessFeedback] = useState<GuessFeedback[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [actualWord, setActualWord] = useState('');
  const [usedLetters, setUsedLetters] = useState<{[key: string]: 'correct' | 'present' | 'absent'}>({});

  const maxAttempts = 6;

  // Reset game when modal opens
  const handleOpenGame = () => {
    setIsOpen(true);
    setGuesses([]);
    setGuessFeedback([]);
    setCurrentGuess('');
    setGameOver(false);
    setWon(false);
    setSubmitting(false);
    setActualWord('');
    setUsedLetters({});
    setStartTime(Date.now());
  };

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
        onComplete(data.result);
        
        // Close modal after showing result for a moment
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      } else {
        alert('Error submitting game: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting Wordle:', error);
      alert('Error submitting game: ' + error);
    }
    
    setSubmitting(false);
  }, [wordle.id, startTime, onComplete]);

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
    if (!isOpen) return;

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
  }, [isOpen, makeGuess, removeLetter, addLetter, submitting, gameOver]);

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleOpenGame}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105"
        >
          🎯 Play Daily Bible Wordle
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {wordle.title}
          </DialogTitle>
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600">{wordle.hint}</p>
            <p className="text-xs text-blue-600">From the Book of {wordle.book}</p>
            <Badge variant="outline" className="text-xs">
              Guess #{guesses.length + 1}/6
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Game Instructions */}
          {guesses.length === 0 && !gameOver && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-semibold text-blue-800 mb-1">How to Play:</p>
              <p className="text-blue-700">Guess the 5-letter word from the Bible passage above. You have 6 attempts!</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  Correct
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  Wrong spot
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  Not in word
                </span>
              </div>
            </div>
          )}

          {/* 6x5 Grid */}
          <div className="grid grid-rows-6 gap-2">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-2">
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
                      className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 ${extraStyle}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Virtual Keyboard */}
          {!gameOver && (
            <div className="space-y-2">
              {KEYBOARD_LAYOUT.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {rowIndex === 2 && (
                    <Button
                      onClick={makeGuess}
                      disabled={currentGuess.length !== 5 || submitting}
                      variant="outline"
                      className="px-2 py-2 text-xs font-medium"
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
                      className={`w-8 h-10 text-xs font-bold transition-all duration-200 ${getKeyboardLetterStyle(letter)}`}
                    >
                      {letter}
                    </Button>
                  ))}
                  
                  {rowIndex === 2 && (
                    <Button
                      onClick={removeLetter}
                      disabled={submitting}
                      variant="outline"
                      className="px-2 py-2 text-xs font-medium"
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
              <div className="text-lg font-bold tracking-wider text-blue-600 min-h-[28px]">
                {currentGuess.padEnd(5, '_').split('').join(' ')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Type letters and press ENTER to guess
              </p>
            </div>
          )}

          {/* Game Over State */}
          {gameOver && (
            <div className="text-center space-y-4">
              {submitting ? (
                <div className="text-blue-600">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>🔄 Submitting your game...</p>
                </div>
              ) : actualWord ? (
                <div className={`p-4 rounded-lg border-2 ${won ? "border-green-400 bg-green-50" : "border-orange-400 bg-orange-50"}`}>
                  {won ? (
                    <div className="text-green-600">
                      <p className="text-2xl mb-2">🎉 Congratulations!</p>
                      <p className="font-bold">You got it in {guesses.length} attempts!</p>
                      <p className="text-lg font-bold tracking-wider mt-2 text-green-800">{actualWord}</p>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      <p className="text-2xl mb-2">😊 Good try!</p>
                      <p>The word was:</p>
                      <p className="text-2xl font-bold tracking-wider mt-2 text-orange-800">{actualWord}</p>
                    </div>
                  )}
                  <p className="text-sm mt-3 text-gray-600">
                    Modal will close automatically...
                  </p>
                </div>
              ) : (
                <div className="text-blue-600">
                  <p>Game completed! Processing results...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}