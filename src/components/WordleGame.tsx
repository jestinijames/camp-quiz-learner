/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface WordleGameProps {
  wordle: {
    id: number;
    title: string;
    hint: string;
    book: string;
  };
  onComplete: (result: any) => void;
}

export function WordleGame({ wordle, onComplete }: WordleGameProps) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(() => Date.now());

  // Load actual answer (we'll get this from the submit response)
  const [actualWord, setActualWord] = useState('');

  const maxAttempts = 6;

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
      } else {
        alert('Error submitting game: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting Wordle:', error);
      alert('Error submitting game: ' + error);
    }
    
    setSubmitting(false);
  }, [wordle.id, startTime, onComplete]);

  const makeGuess = () => {
    if (currentGuess.length !== 5 || gameOver) return;
    
    const guess = currentGuess.toUpperCase();
    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    // For now, we don't know the actual word, so we can't determine win condition
    // We'll submit after max attempts and let the server tell us the result
    if (newGuesses.length >= maxAttempts) {
      setGameOver(true);
      setWon(false); // We don't know yet
      submitGame(false, newGuesses); // Server will tell us if we actually won
    }
  };

  const checkGuess = () => {
    if (currentGuess.length !== 5) return;
    
    // For demonstration, let's submit early if user types a common word
    // In reality, we'd need the server to validate each guess
    const guess = currentGuess.toUpperCase();
    const newGuesses = [...guesses, guess];
    
    // Let's assume some words might be correct for demo
    const commonBiblicalWords = ['GRACE', 'FAITH', 'LIGHT', 'PEACE', 'TRUTH', 'JESUS'];
    
    if (commonBiblicalWords.includes(guess)) {
      setGuesses(newGuesses);
      setGameOver(true);
      setWon(true);
      setCurrentGuess('');
      submitGame(true, newGuesses);
      return;
    }

    makeGuess();
  };

  const getLetterStyle = (letter: string, position: number, guessIndex: number) => {
    const guess = guesses[guessIndex];
    if (!guess || !actualWord) return 'bg-gray-200 border-gray-300';

    if (actualWord[position] === letter) {
      return 'bg-green-500 text-white border-green-500'; // Correct position
    } else if (actualWord.includes(letter)) {
      return 'bg-yellow-500 text-white border-yellow-500'; // Wrong position
    } else {
      return 'bg-gray-500 text-white border-gray-500'; // Not in word
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkGuess();
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + e.key.toUpperCase());
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{wordle.title}</CardTitle>
        <p className="text-sm text-gray-600 text-center">{wordle.hint}</p>
        <p className="text-xs text-blue-600 text-center">From the Book of {wordle.book}</p>
      </CardHeader>
      <CardContent>
        {/* Game Instructions */}
        {guesses.length === 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-semibold text-blue-800 mb-1">How to Play:</p>
            <p className="text-blue-700">Guess the 5-letter word from the Bible passage above. You have 6 attempts!</p>
          </div>
        )}

        {/* 6x5 Grid */}
        <div className="grid grid-rows-6 gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                let letter = '';
                let extraStyle = '';

                if (guesses[rowIndex]) {
                  letter = guesses[rowIndex][colIndex] || '';
                  extraStyle = actualWord ? getLetterStyle(letter, colIndex, rowIndex) : 'bg-blue-100 border-blue-300';
                } else if (rowIndex === guesses.length && !gameOver) {
                  // Current guess row
                  letter = currentGuess[colIndex] || '';
                  extraStyle = letter ? 'border-blue-400 bg-blue-50' : 'border-gray-300';
                } else {
                  extraStyle = 'border-gray-300';
                }

                return (
                  <div
                    key={colIndex}
                    className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-lg ${extraStyle}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Input and Controls */}
        {!gameOver && (
          <div className="space-y-4">
            <Input
              type="text"
              maxLength={5}
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
              onKeyDown={handleKeyPress}
              className="w-full p-2 border rounded text-center uppercase text-lg font-bold"
              placeholder="Type 5-letter word"
              disabled={submitting}
            />
            <div className="flex gap-2">
              <Button 
                onClick={checkGuess}
                disabled={currentGuess.length !== 5 || submitting}
                className="flex-1"
              >
                Submit Guess ({guesses.length + 1}/6)
              </Button>
              <Button 
                onClick={() => setCurrentGuess('')}
                variant="outline"
                disabled={submitting}
              >
                Clear
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Press Enter to submit • Type letters to guess
            </p>
          </div>
        )}

        {/* Game Over State */}
        {gameOver && (
          <div className="text-center space-y-4">
            {submitting ? (
              <div className="text-blue-600">
                <p>🔄 Submitting your game...</p>
              </div>
            ) : actualWord ? (
              <div className={won ? "text-green-600" : "text-orange-600"}>
                {won ? (
                  <div>
                    <p className="text-xl">🎉 Congratulations!</p>
                    <p>You got it in {guesses.length} attempts!</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl">😊 Good try!</p>
                    <p>The word was: <strong className="text-lg">{actualWord}</strong></p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-blue-600">
                <p>Game completed! Processing results...</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}