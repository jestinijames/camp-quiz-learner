'use client';
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, X } from 'lucide-react';
import { useGameState, FlipState } from '@/contexts/GameStateContext';

type Card = {
  id: number;
  text: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
};

type FlipGameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (timeSpent: number, moves: number) => void;
  gameId: number;
  gameData: {
    id: number;
    title: string;
    verseData: string; // JSON string of verse pairs
    timeLimit: number;
  } | null;
};

export default function FlipGameModal({
  isOpen,
  onClose,
  onComplete,
  gameId,
  gameData,
}: FlipGameModalProps) {
  const { getFlipState, setFlipState } = useGameState();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [isProcessingFlip, setIsProcessingFlip] = useState(false);

  const initializeGame = useCallback(() => {
    if (!gameData) return;

    try {
      const versePairs: { start: string; end: string; reference: string }[] = JSON.parse(gameData.verseData);
      
      // Create card pairs
      const cardData: Card[] = [];
      versePairs.forEach((pair, index) => {
        cardData.push({
          id: index * 2,
          text: pair.start,
          pairId: index,
          isFlipped: false,
          isMatched: false,
        });
        cardData.push({
          id: index * 2 + 1,
          text: pair.end,
          pairId: index,
          isFlipped: false,
          isMatched: false,
        });
      });

      // Shuffle cards
      const shuffled = cardData.sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setFlippedCards([]);
      setMatchedPairs([]);
      setMoves(0);
      setStartTime(Date.now());
      setHasStarted(false);
      setGameOver(false);
      setHasWon(false);
    } catch (error) {
      console.error('Failed to initialize flip game:', error);
    }
  }, [gameData]);

  // Load or initialize game state
  useEffect(() => {
    if (!isOpen || !gameData) {
      return;
    }

    const savedState = getFlipState(gameId);

    if (savedState) {
      // Restore saved state
      setCards(savedState.cards);
      setFlippedCards(savedState.flippedCards);
      setMatchedPairs(savedState.matchedPairs);
      setMoves(savedState.moves);
      setHasStarted(savedState.hasStarted);
      setStartTime(savedState.startTime);
    } else {
      // Initialize new game
      initializeGame();
    }
  }, [isOpen, gameData, gameId, getFlipState, initializeGame]);

  // Save state whenever it changes
  useEffect(() => {
    if (!hasStarted || !gameData) return;

    const state: FlipState = {
      gameId,
      hasStarted,
      cards,
      flippedCards,
      matchedPairs,
      moves,
      startTime,
      timeLeft: 0, // No longer used but kept for compatibility
      pausedAt: isOpen ? undefined : Date.now(),
    };

    setFlipState(gameId, state);
  }, [hasStarted, cards, flippedCards, matchedPairs, moves, startTime, isOpen, gameId, gameData, setFlipState]);

  // Check for win condition
  useEffect(() => {
    if (matchedPairs.length === 8 && hasStarted && !gameOver) {
      setHasWon(true);
      setGameOver(true);
      
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (onComplete) {
        onComplete(timeSpent, moves);
      }
    }
  }, [matchedPairs, hasStarted, gameOver, startTime, moves, onComplete]);

  const handleStart = () => {
    setHasStarted(true);
    setStartTime(Date.now());
  };

  const handleCardClick = useCallback((cardId: number) => {
    if (!hasStarted || gameOver || isProcessingFlip) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // Can only flip 2 cards at a time
    if (flippedCards.length >= 2) return;

    // Flip the card
    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    setMoves(prev => prev + 1);

    // Check if two cards are flipped
    if (newFlipped.length === 2) {
      setIsProcessingFlip(true);
      
      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find(c => c.id === firstId);
      const secondCard = newCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId
              ? { ...c, isMatched: true }
              : c
          ));
          setMatchedPairs(prev => [...prev, firstCard.pairId]);
          setFlippedCards([]);
          setIsProcessingFlip(false);
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedCards([]);
          setIsProcessingFlip(false);
        }, 1200);
      }
    }
  }, [hasStarted, gameOver, isProcessingFlip, cards, flippedCards]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    onClose();
  };

  if (!gameData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{gameData.title}</span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {/* Game Stats */}
          <div className="flex justify-between items-center bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">BONUS Game</span>
            </div>
            <div className="text-sm">
              Moves: <span className="font-semibold">{moves}</span>
            </div>
            <div className="text-sm">
              Matched: <span className="font-semibold">{matchedPairs.length}/8</span>
            </div>
          </div>

          {/* Start Game */}
          {!hasStarted && !gameOver && (
            <div className="text-center space-y-4 py-8">
              <div className="space-y-2">
                <div className="inline-block bg-linear-to-r from-amber-400 to-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full mb-2">
                  ⭐ BONUS GAME
                </div>
                <h3 className="text-xl font-bold">Scripture Memory Match</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Match the beginning and ending of each verse
                </p>
                <p className="text-sm text-gray-500">
                  No timer! Take your time and earn up to 4 points.
                </p>
              </div>
              <Button onClick={handleStart} size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Game
              </Button>
            </div>
          )}

          {/* Game Grid */}
          {hasStarted && !gameOver && (
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.isFlipped || card.isMatched || isProcessingFlip}
                  className={`
                    relative aspect-square rounded-lg transition-all duration-300 transform
                    ${card.isFlipped || card.isMatched 
                      ? 'bg-white dark:bg-gray-700 border-2 border-blue-500' 
                      : 'bg-linear-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    }
                    ${card.isMatched ? 'opacity-60' : ''}
                    ${!card.isFlipped && !card.isMatched ? 'cursor-pointer hover:scale-105' : ''}
                    disabled:cursor-not-allowed
                    shadow-lg
                  `}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden">
                    {card.isFlipped || card.isMatched ? (
                      <span className="text-[8px] sm:text-[10px] md:text-xs text-center leading-[1.1] wrap-break-word w-full px-0.5" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxHeight: '100%' }}>
                        {card.text}
                      </span>
                    ) : (
                      <span className="text-2xl sm:text-3xl md:text-4xl text-white">?</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div className="text-center space-y-4 py-8">
              {hasWon ? (
                <>
                  <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
                  <h3 className="text-2xl font-bold text-green-600">Congratulations!</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You matched all pairs in {moves} moves!
                  </p>
                  <p className="text-lg font-semibold bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    +4 Bonus Points!
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-blue-600">Game Incomplete</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You matched {matchedPairs.length} out of 8 pairs
                  </p>
                  <p className="text-sm text-gray-500">
                    You earned {matchedPairs.length * 0.5} points!
                  </p>
                  <p className="text-xs text-gray-400">Try again to get all 4 points!</p>
                </>
              )}
              <Button onClick={handleClose} className="mt-4">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
