/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Droplets, Clock, Target, Zap } from 'lucide-react';

interface VerseDropGameModalProps {
  game: {
    id: number;
    title: string;
    book: string;
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
    timeLimit: number;
  };
  onComplete: (result: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface FallingWord {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  isCorrect: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function VerseDropGameModal({ game, onComplete, isOpen: externalIsOpen, onClose: externalOnClose }: VerseDropGameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignedVerse, setAssignedVerse] = useState<{ ref: string; text: string } | null>(null);
  const [verseWords, setVerseWords] = useState<string[]>([]);
  const [collectedWords, setCollectedWords] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(900);
  const [canvasHeight, setCanvasHeight] = useState(500);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const nextWordIdRef = useRef(0);
  const nextParticleIdRef = useRef(0);
  
  // Use refs for animation data to avoid re-render loops
  const fallingWordsRef = useRef<FallingWord[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const modalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setModalOpen = externalOnClose ? (open: boolean) => {
    if (!open) handleClose();
  } : setIsOpen;

  // Dynamic canvas sizing based on screen dimensions
  useEffect(() => {
    const updateCanvasSize = () => {
      // Use almost entire viewport for maximum visibility
      const width = window.innerWidth - 16; // Minimal margin
      const height = window.innerHeight - 180; // Minimal space for UI
      setCanvasWidth(width);
      setCanvasHeight(height);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, []);

  // Start game and fetch assigned verse
  const startGame = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/verse-drop/${game.id}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        const { assignedVerseRef, assignedVerseText, timeLimit, alreadyStarted } = data.attempt;
        
        setAssignedVerse({ ref: assignedVerseRef, text: assignedVerseText });
        
        // Split verse into words
        const words = assignedVerseText.split(/\s+/).filter((w: string) => w.length > 0);
        setVerseWords(words);
        
        setTimeLeft(timeLimit);
        setStartTime(Date.now());
        setHasStarted(true);

        if (alreadyStarted) {
          toast.info('Resuming your game...');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start game');
        handleClose();
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  // Auto-start when modal opens
  useEffect(() => {
    if (modalIsOpen && !hasStarted) {
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalIsOpen, hasStarted]);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, gameOver]);

  // Spawn falling words periodically
  useEffect(() => {
    if (!hasStarted || gameOver || verseWords.length === 0) return;

    // Common biblical decoy words
    const decoys = [
      'blessed', 'covenant', 'faith', 'grace', 'mercy', 'righteousness', 
      'salvation', 'glory', 'holy', 'kingdom', 'eternal', 'spirit',
      'heaven', 'rejoice', 'praise', 'worship', 'testimony', 'truth',
      'wisdom', 'knowledge', 'understanding', 'peace', 'hope', 'love',
      'power', 'strength', 'mighty', 'deliver', 'redeem', 'sanctify'
    ];

    const spawnInterval = setInterval(() => {
      // Spawn 4-5 words at a time for abundant choices
      const wordsToSpawn = Math.floor(Math.random() * 2) + 4;
      const newWords: FallingWord[] = [];

      for (let i = 0; i < wordsToSpawn; i++) {
        let word: string;
        
        // 80% chance real word from verse, 20% chance decoy (less decoys, more verse words)
        if (Math.random() < 0.8) {
          // Real word from the verse
          word = verseWords[Math.floor(Math.random() * verseWords.length)];
        } else {
          // Random decoy word that's NOT in the verse
          const availableDecoys = decoys.filter(d => 
            !verseWords.some(v => v.toLowerCase() === d.toLowerCase())
          );
          word = availableDecoys.length > 0 
            ? availableDecoys[Math.floor(Math.random() * availableDecoys.length)]
            : verseWords[Math.floor(Math.random() * verseWords.length)];
        }

        newWords.push({
          id: nextWordIdRef.current++,
          word,
          x: Math.random() * 80 + 10, // 10-90% of width
          y: -10,
          speed: Math.random() * 0.3 + 0.3, // 0.3-0.6 units per frame (slower)
          isCorrect: false // Don't show hints
        });
      }

      fallingWordsRef.current = [...fallingWordsRef.current, ...newWords];
    }, 800); // Spawn every 0.8 seconds - very frequent

    return () => clearInterval(spawnInterval);
  }, [hasStarted, gameOver, verseWords]);

  // Animation loop
  useEffect(() => {
    if (!hasStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update falling words positions
      fallingWordsRef.current = fallingWordsRef.current
        .map(word => ({ ...word, y: word.y + word.speed }))
        .filter(word => word.y < 105); // Remove words that fell off screen

      // Update particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.2, // Gravity
          life: p.life - 1
        }))
        .filter(p => p.life > 0);

      // Draw falling words
      fallingWordsRef.current.forEach(word => {
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#374151'; // All words same color - no hints!
        ctx.textAlign = 'center';
        ctx.fillText(word.word, (word.x / 100) * canvas.width, (word.y / 100) * canvas.height);
        ctx.restore();
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [hasStarted, gameOver]);

  // Handle word click
  const handleWordClick = (clickedWord: FallingWord) => {
    const expectedWord = verseWords[collectedWords.length];

    if (clickedWord.word === expectedWord) {
      // Correct word!
      setCollectedWords(prev => [...prev, clickedWord.word]);
      fallingWordsRef.current = fallingWordsRef.current.filter(w => w.id !== clickedWord.id);
      
      // Create success particles
      createParticles(clickedWord.x, clickedWord.y, '#22c55e');
      toast.success(`✓ ${clickedWord.word}`);

      // Check if verse complete
      if (collectedWords.length + 1 === verseWords.length) {
        handleVerseComplete();
      }
    } else {
      // Wrong word!
      setMistakes(prev => prev + 1);
      fallingWordsRef.current = fallingWordsRef.current.filter(w => w.id !== clickedWord.id);
      
      // Create error particles
      createParticles(clickedWord.x, clickedWord.y, '#ef4444');
      toast.error(`✗ Wrong word!`);
    }
  };

  // Create explosion particles
  const createParticles = (x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const particleCount = 15;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 3 + 2;
      
      newParticles.push({
        id: nextParticleIdRef.current++,
        x: (x / 100) * canvas.width,
        y: (y / 100) * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Handle verse completion
  const handleVerseComplete = async () => {
    setGameOver(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    await submitGame(verseWords.length, verseWords.length, mistakes, timeSpent);
  };

  // Handle time up
  const handleTimeUp = async () => {
    setGameOver(true);
    toast.warning('Time\'s up!');
    const timeSpent = game.timeLimit;
    await submitGame(collectedWords.length, verseWords.length, mistakes, timeSpent);
  };

  // Submit game results
  const submitGame = async (correctWords: number, totalWords: number, finalMistakes: number, timeSpent: number) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/verse-drop/${game.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctWords,
          totalWords,
          mistakes: finalMistakes,
          timeSpent
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.result.message);
        onComplete(data.result);
        setTimeout(() => handleClose(), 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit game');
      }
    } catch (error) {
      console.error('Error submitting game:', error);
      toast.error('Failed to submit game');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    // Auto-submit if game not finished
    if (hasStarted && !gameOver && !submitting) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      submitGame(collectedWords.length, verseWords.length, mistakes, timeSpent);
    }
    
    if (externalOnClose) {
      externalOnClose();
    } else {
      setIsOpen(false);
    }
    
    // Reset game state
    setHasStarted(false);
    setAssignedVerse(null);
    setVerseWords([]);
    fallingWordsRef.current = [];
    particlesRef.current = [];
    setCollectedWords([]);
    setMistakes(0);
    setGameOver(false);
    setTimeLeft(0);
  };

  const progress = verseWords.length > 0 ? (collectedWords.length / verseWords.length) * 100 : 0;

  return (
    <Dialog open={modalIsOpen} onOpenChange={setModalOpen}>
      <DialogContent 
        className="!fixed !inset-0 !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !rounded-none p-0 gap-0 flex flex-col m-0"
        style={{ top: 0, left: 0, right: 0, bottom: 0, transform: 'none', maxWidth: '100vw', width: '100vw', height: '100vh' }}
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 p-2 border-b">
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">{game.title}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>{collectedWords.length}/{verseWords.length}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-red-500" />
                <span>{mistakes}</span>
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
            {/* Verse reference - Hidden during gameplay to prevent cheating */}

            {/* Collected words display */}
            <div className="shrink-0 p-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
              <p className="text-sm leading-tight">
                {collectedWords.length > 0 ? (
                  collectedWords.join(' ')
                ) : (
                  <span className="text-gray-400">Tap the correct words as they fall...</span>
                )}
              </p>
            </div>

            {/* Game canvas */}
            <div className="flex-1 relative border-2 border-gray-300 dark:border-gray-600 rounded overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
              <canvas 
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full cursor-pointer touch-none"
                onClick={(e) => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  
                  const rect = canvas.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;

                  // Find clicked word from ref with generous hit area
                  const clickedWord = fallingWordsRef.current.find(word => {
                    const wordWidth = word.word.length * 2; // Very generous horizontal area for mobile
                    const hitHeight = 8; // Very generous vertical area for mobile tapping
                    return Math.abs(word.x - x) < wordWidth && Math.abs(word.y - y) < hitHeight;
                  });

                  if (clickedWord && !gameOver) {
                    handleWordClick(clickedWord);
                  }
                }}
              />

              {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center space-y-4">
                    <h3 className="text-2xl font-bold">
                      {collectedWords.length === verseWords.length ? '🎉 Perfect!' : 'Time\'s Up!'}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg">
                        Words: {collectedWords.length}/{verseWords.length}
                      </p>
                      <p className="text-lg">
                        Mistakes: {mistakes}
                      </p>
                    </div>
                    {submitting && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span>Submitting...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
