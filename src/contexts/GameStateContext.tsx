/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// Types for each game state
export type QuizState = {
  gameId: number;
  hasStarted: boolean;
  questions: any[];
  sessionId: number | null;
  answers: any[];
  currentQuestion: number;
  timeLeft: number | null;
  startTime: number;
  tabSwitchCount: number;
  pausedAt?: number; // Timestamp when modal was closed
};

export type EmojiState = {
  gameId: number;
  hasStarted: boolean;
  attemptId: number | null;
  puzzle: any | null;
  answer: string;
  startTime: number;
  timeLeft: number;
  pausedAt?: number;
};

export type WordleState = {
  gameId: number;
  hasStarted: boolean;
  guesses: string[];
  guessFeedback: any[][];
  currentGuess: string;
  usedLetters: { [key: string]: 'correct' | 'present' | 'absent' };
  startTime: number;
  timeLeft: number;
  pausedAt?: number;
};

export type VerseDropState = {
  gameId: number;
  hasStarted: boolean;
  assignedVerse: { ref: string; text: string } | null;
  verseWords: string[];
  collectedWords: string[];
  mistakes: number;
  startTime: number;
  timeLeft: number;
  pausedAt?: number;
};

export type FlipState = {
  gameId: number;
  hasStarted: boolean;
  cards: { id: number; text: string; pairId: number; isFlipped: boolean; isMatched: boolean }[];
  flippedCards: number[];
  matchedPairs: number[];
  moves: number;
  startTime: number;
  timeLeft: number;
  pausedAt?: number;
};

type GameStates = {
  quiz: { [key: number]: QuizState };
  emoji: { [key: number]: EmojiState };
  wordle: { [key: number]: WordleState };
  versedrop: { [key: number]: VerseDropState };
  flip: { [key: number]: FlipState };
};

type GameStateContextType = {
  getQuizState: (gameId: number) => QuizState | null;
  setQuizState: (gameId: number, state: QuizState | null) => void;
  getEmojiState: (gameId: number) => EmojiState | null;
  setEmojiState: (gameId: number, state: EmojiState | null) => void;
  getWordleState: (gameId: number) => WordleState | null;
  setWordleState: (gameId: number, state: WordleState | null) => void;
  getVerseDropState: (gameId: number) => VerseDropState | null;
  setVerseDropState: (gameId: number, state: VerseDropState | null) => void;
  getFlipState: (gameId: number) => FlipState | null;
  setFlipState: (gameId: number, state: FlipState | null) => void;
  clearAllStates: () => void;
  clearGameType: (gameType: 'quiz' | 'emoji' | 'wordle' | 'versedrop' | 'flip') => void;
};

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

const STORAGE_KEY = 'camp-quiz-game-states';

// Load from localStorage on initialization
function loadGameStates(): GameStates {
  if (typeof window === 'undefined') {
    return { quiz: {}, emoji: {}, wordle: {}, versedrop: {}, flip: {} };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load game states from localStorage:', error);
  }
  
  return { quiz: {}, emoji: {}, wordle: {}, versedrop: {}, flip: {} };
}

// Save to localStorage
function saveGameStates(states: GameStates) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save game states to localStorage:', error);
  }
}

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [gameStates, setGameStates] = useState<GameStates>(loadGameStates);

  const getQuizState = useCallback((gameId: number) => {
    return gameStates.quiz[gameId] || null;
  }, [gameStates.quiz]);

  const setQuizState = useCallback((gameId: number, state: QuizState | null) => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        quiz: state ? { ...prev.quiz, [gameId]: state } : 
              (() => {
                const { [gameId]: _unused, ...rest } = prev.quiz;
                return rest;
              })()
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  const getEmojiState = useCallback((gameId: number) => {
    return gameStates.emoji[gameId] || null;
  }, [gameStates.emoji]);

  const setEmojiState = useCallback((gameId: number, state: EmojiState | null) => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        emoji: state ? { ...prev.emoji, [gameId]: state } : 
               (() => {
                 const { [gameId]: _unused, ...rest } = prev.emoji;
                 return rest;
               })()
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  const getWordleState = useCallback((gameId: number) => {
    return gameStates.wordle[gameId] || null;
  }, [gameStates.wordle]);

  const setWordleState = useCallback((gameId: number, state: WordleState | null) => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        wordle: state ? { ...prev.wordle, [gameId]: state } : 
                (() => {
                  const { [gameId]: _unused, ...rest } = prev.wordle;
                  return rest;
                })()
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  const getVerseDropState = useCallback((gameId: number) => {
    return gameStates.versedrop[gameId] || null;
  }, [gameStates.versedrop]);

  const setVerseDropState = useCallback((gameId: number, state: VerseDropState | null) => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        versedrop: state ? { ...prev.versedrop, [gameId]: state } : 
                   (() => {
                     const { [gameId]: _unused, ...rest } = prev.versedrop;
                     return rest;
                   })()
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  const getFlipState = useCallback((gameId: number) => {
    return gameStates.flip[gameId] || null;
  }, [gameStates.flip]);

  const setFlipState = useCallback((gameId: number, state: FlipState | null) => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        flip: state ? { ...prev.flip, [gameId]: state } : 
               (() => {
                 const { [gameId]: _unused, ...rest } = prev.flip;
                 return rest;
               })()
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  const clearAllStates = useCallback(() => {
    const emptyStates = {
      quiz: {},
      emoji: {},
      wordle: {},
      versedrop: {},
      flip: {},
    };
    setGameStates(emptyStates);
    saveGameStates(emptyStates);
  }, []);

  const clearGameType = useCallback((gameType: 'quiz' | 'emoji' | 'wordle' | 'versedrop' | 'flip') => {
    setGameStates(prev => {
      const newStates = {
        ...prev,
        [gameType]: {},
      };
      saveGameStates(newStates);
      return newStates;
    });
  }, []);

  return (
    <GameStateContext.Provider
      value={{
        getQuizState,
        setQuizState,
        getEmojiState,
        setEmojiState,
        getWordleState,
        setWordleState,
        getVerseDropState,
        setVerseDropState,
        getFlipState,
        setFlipState,
        clearAllStates,
        clearGameType,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
