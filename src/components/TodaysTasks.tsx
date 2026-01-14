/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ReadPortionModal } from './ReadPortionModal';
import { CollaborationModal } from './CollaborationModal';
import { QuizModal } from './QuizModal';
import { WordleGameModal } from './WordleGameModal';
import { EmojiGameModal } from './EmojiGameModal';
import { VerseDropGameModal } from './VerseDropGameModal';
import FlipGameModal from './FlipGameModal';
import FlipGameRulesModal from './FlipGameRulesModal';
import { InsightSubmissionModal } from './InsightSubmissionModal';
import { useGameState } from '@/contexts/GameStateContext';
import { 
  BookOpen, 
  ClipboardCheck, 
  Puzzle, 
  Smile, 
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  BadgeQuestionMark,
  Sparkles,
  Droplets,
  Clock,
  Layers
} from 'lucide-react';

type WallSession = {
  id: number;
  title: string;
  description: string | null;
  BibleBook: {
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  _count: {
    CollaborationCard: number;
  };
};

type Quiz = {
  id: number;
  title: string;
  description?: string;
  BibleBook?: {
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  timeLimit?: number;
  _count?: {
    Question: number;
  };
};

type Wordle = {
  id: number;
  title: string;
  hint: string;
  book: string;
};

type EmojiGame = {
  id: number;
  title: string;
  bookName: string;
  passage: string;
  hint?: string;
};

type Task = {
  id: string;
  type: 'passage' | 'quiz' | 'wordle' | 'emoji' | 'wall' | 'insight' | 'versedrop' | 'flip';
  title: string;
  description: string;
  points: string;
  icon: any;
  data: any;
  completed: boolean;
  order: number;
};

interface TodaysTasksProps {
  user: any;
}

export function TodaysTasks({ user }: TodaysTasksProps) {
  const { getQuizState, getWordleState, getEmojiState, getVerseDropState, getFlipState, clearGameType } = useGameState();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameTimers, setGameTimers] = useState<Record<string, number>>({});
  
  // Modal states
  const [readPortionModalOpen, setReadPortionModalOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [wordleModalOpen, setWordleModalOpen] = useState(false);
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);
  const [verseDropModalOpen, setVerseDropModalOpen] = useState(false);
  const [flipModalOpen, setFlipModalOpen] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  
  const [selectedWallId, setSelectedWallId] = useState<number | null>(null);
  const [selectedWallData, setSelectedWallData] = useState<WallSession | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedWordle, setSelectedWordle] = useState<Wordle | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiGame | null>(null);
  const [selectedVerseDrop, setSelectedVerseDrop] = useState<any>(null);
  const [selectedFlip, setSelectedFlip] = useState<any>(null);
  const [flipRulesModalOpen, setFlipRulesModalOpen] = useState(false);

  const fetchAllTasks = useCallback(async () => {
    if (!user || user.isAdmin) return;

    setLoading(true);
    try {
      const taskList: Task[] = [];

      // 1. Fetch Collaboration Walls (Read Passage)
      const wallsResponse = await fetch('/api/collaboration-walls');
      if (wallsResponse.ok) {
        const walls: WallSession[] = await wallsResponse.json();
        
        for (const wall of walls) {
          // Safety check for wall data
          if (!wall || !wall.id || !wall.BibleBook) {
            console.error('Invalid wall data:', wall);
            continue;
          }

          // Check if user has listened
          const statusResponse = await fetch(`/api/collaboration-walls/${wall.id}/listen-status`);
          let hasListened = false;
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            hasListened = status.hasListened;
          }

          if (!hasListened) {
            taskList.push({
              id: `passage-${wall.id}`,
              type: 'passage',
              title: `Read: ${wall.title}`,
              description: `${wall.BibleBook.name} ${wall.fromChapter}:${wall.fromVerse} - ${wall.toChapter}:${wall.toVerse}`,
              points: '+4 points',
              icon: BookOpen,
              data: wall,
              completed: false,
              order: 1
            });
          }

          // Check if user has already submitted any learning card (they only get points once)
          const cardsResponse = await fetch(`/api/collaboration-walls/${wall.id}/cards`);
          let hasSubmittedInsight = false;
          if (cardsResponse.ok) {
            const cards = await cardsResponse.json();
            // Check if current user has submitted any card using authorId
            hasSubmittedInsight = cards.some((card: any) => card?.authorId === user.id || card?.Member?.id === user.id);
          }

          // Add insight task only if user hasn't submitted yet (order 3 - right after quiz)
          if (!hasSubmittedInsight) {
            taskList.push({
              id: `insight-${wall.id}`,
              type: 'insight',
              title: 'Share Your Learning',
              description: `${wall.title}`,
              points: '+2 points',
              icon: Sparkles,
              data: wall,
              completed: false,
              order: 3
            });
          }
          
          // Always add wall for collaboration (order 6)
          taskList.push({
            id: `wall-${wall.id}`,
            type: 'wall',
            title: `View Insights: ${wall.title}`,
            description: `${wall._count.CollaborationCard} insights shared`,
            points: 'Collaborative',
            icon: MessageSquare,
            data: wall,
            completed: false,
            order: 6
          });
        }
      }

      // 2. Fetch Available Quizzes
      const quizzesResponse = await fetch('/api/quiz/available');
      if (quizzesResponse.ok) {
        const quizzes: Quiz[] = await quizzesResponse.json();
        quizzes.forEach((quiz) => {
          const maxPoints = (quiz._count?.Question || 0) * 10;
          taskList.push({
            id: `quiz-${quiz.id}`,
            type: 'quiz',
            title: "Today's Quiz Challenge",
            description: `${quiz.BibleBook?.name} ${quiz.fromChapter}:${quiz.fromVerse} - ${quiz.toChapter}:${quiz.toVerse}`,
            points: `Up to 30 points`,
            icon: BadgeQuestionMark,
            data: quiz,
            completed: false,
            order: 2
          });
        });
      }

      // 3. Fetch  Wordle
      const wordleResponse = await fetch('/api/wordle/available');
      if (wordleResponse.ok) {
        const wordleData = await wordleResponse.json();
        if (wordleData.wordle && !wordleData.hasPlayed) {
          taskList.push({
            id: `wordle-${wordleData.wordle.id}`,
            type: 'wordle',
            title: 'Wordle',
            description: wordleData.wordle.hint,
            points: '+2 to +10 points',
            icon: Puzzle,
            data: wordleData.wordle,
            completed: false,
            order: 4
          });
        }
      }

      // 4. Fetch Emoji Games
      try {
        const emojiResponse = await fetch('/api/emoji/available');
        if (emojiResponse.ok) {
          const emojiData = await emojiResponse.json();
          
          const games = emojiData.games || [];
          games.forEach((game: EmojiGame) => {
            taskList.push({
              id: `emoji-${game.id}`,
              type: 'emoji',
              title:  'Emoji Game',
              description:  `${game.bookName} ${game.passage}`,
              points: '+2 to +10 points',
              icon: Smile,
              data: game,
              completed: false,
              order: 5
            });
          });
        } else {
          console.error('Emoji response not ok:', await emojiResponse.text());
        }
      } catch (err) {
        console.error('Error fetching emoji game:', err);
      }

      // 5. Fetch Verse Drop
      try {
        const verseDropResponse = await fetch('/api/verse-drop/available');
        if (verseDropResponse.ok) {
          const verseDropData = await verseDropResponse.json();
          if (verseDropData.available && verseDropData.game) {
            taskList.push({
              id: `versedrop-${verseDropData.game.id}`,
              type: 'versedrop',
              title: 'Verse Drop Challenge',
              description: 'Click falling words in order to complete the verse',
              points: 'Up to +10 points',
              icon: Droplets,
              data: verseDropData.game,
              completed: false,
              order: 5.5
            });
          }
        }
      } catch (err) {
        console.error('Error fetching verse drop:', err);
      }

      // 6. Fetch Flip Card Memory Game
      try {
        const flipResponse = await fetch('/api/flip/active');
        if (flipResponse.ok) {
          const flipData = await flipResponse.json();
          if (flipData.game && (!flipData.attempt || !flipData.attempt.completed)) {
            taskList.push({
              id: `flip-${flipData.game.id}`,
              type: 'flip',
              title: 'Memory Match Game',
              description: `Match verse pairs from ${flipData.game.bookName}`,
              points: 'Up to +4 points',
              icon: Layers,
              data: flipData.game,
              completed: false,
              order: 5.6
            });
          }
        }
      } catch (err) {
        console.error('Error fetching flip game:', err);
      }

      // Sort tasks by order
      taskList.sort((a, b) => a.order - b.order);
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  // Monitor active game timers and auto-expire
  useEffect(() => {
    const monitorTimers = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};
      const expiredGames: string[] = [];

      tasks.forEach(task => {
        let state = null;
        let timeLimit = 0;
        let gameKey = '';

        if (task.type === 'quiz' && task.data) {
          state = getQuizState(task.data.id);
          timeLimit = task.data.timeLimit ? task.data.timeLimit * 60 : 0;
          gameKey = `quiz-${task.data.id}`;
        } else if (task.type === 'wordle' && task.data) {
          state = getWordleState(task.data.id);
          timeLimit = 240; // 4 minutes
          gameKey = `wordle-${task.data.id}`;
        } else if (task.type === 'emoji' && task.data) {
          state = getEmojiState(task.data.id);
          timeLimit = 240; // 4 minutes
          gameKey = `emoji-${task.data.id}`;
        } else if (task.type === 'versedrop' && task.data) {
          state = getVerseDropState(task.data.id);
          timeLimit = task.data.timeLimit || 180; // Default 3 minutes
          gameKey = `versedrop-${task.data.id}`;
        } else if (task.type === 'flip' && task.data) {
          state = getFlipState(task.data.id);
          timeLimit = task.data.timeLimit || 240; // Default 4 minutes
          gameKey = `flip-${task.data.id}`;
        }

        if (state && state.hasStarted && state.startTime && timeLimit > 0) {
          const elapsed = Math.floor((now - state.startTime) / 1000);
          const remaining = Math.max(0, timeLimit - elapsed);
          
          if (remaining > 0) {
            newTimers[gameKey] = remaining;
          } else if (!expiredGames.includes(gameKey)) {
            // Timer expired - mark for removal
            expiredGames.push(gameKey);
          }
        }
      });

      setGameTimers(newTimers);

      // Remove expired games
      if (expiredGames.length > 0) {
        expiredGames.forEach(key => {
          const [type, id] = key.split('-');
          console.log(`Game ${key} has expired, auto-removing`);
          clearGameType(type as 'quiz' | 'wordle' | 'emoji' | 'versedrop' | 'flip');
          
          // Remove task from UI
          setTasks(prev => prev.filter(t => {
            const taskId = `${t.type}-${t.data?.id}`;
            return taskId !== key;
          }));
        });
      }
    }, 1000); // Check every second

    return () => clearInterval(monitorTimers);
  }, [tasks, getQuizState, getWordleState, getEmojiState, getVerseDropState, clearGameType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTaskTimer = (task: Task) => {
    // Flip game has no timer (bonus game)
    if (task.type === 'flip') {
      return undefined;
    }
    const key = `${task.type}-${task.data?.id}`;
    return gameTimers[key];
  };

  const handleTaskClick = (task: Task) => {
    switch (task.type) {
      case 'passage':
        setSelectedWallId(task.data.id);
        setReadPortionModalOpen(true);
        break;
      case 'insight':
        setSelectedWallId(task.data.id);
        setSelectedWallData(task.data);
        setInsightModalOpen(true);
        break;
      case 'wall':
        setSelectedWallId(task.data.id);
        setCollabModalOpen(true);
        break;
      case 'quiz':
        setSelectedQuiz(task.data);
        setQuizModalOpen(true);
        break;
      case 'wordle':
        setSelectedWordle(task.data);
        setWordleModalOpen(true);
        break;
      case 'emoji':
        setSelectedEmoji(task.data);
        setEmojiModalOpen(true);
        break;
      case 'versedrop':
        setSelectedVerseDrop(task.data);
        setVerseDropModalOpen(true);
        break;
      case 'flip':
        setSelectedFlip(task.data);
        setFlipModalOpen(true);
        break;
    }
  };

  const handleListeningComplete = (wallId: number) => {
    // Remove the passage task for this wall
    setTasks(prev => prev.filter(t => t.id !== `passage-${wallId}`));
    setReadPortionModalOpen(false);
  };

  const handleQuizComplete = () => {
    setQuizModalOpen(false);
    // Refresh tasks to remove completed quiz
    fetchAllTasks();
  };

  const handleWordleComplete = () => {
    setWordleModalOpen(false);
    // Remove wordle task
    setTasks(prev => prev.filter(t => t.type !== 'wordle'));
  };

  const handleEmojiComplete = () => {
    setEmojiModalOpen(false);
    // Refresh tasks to remove completed emoji game
    fetchAllTasks();
  };

  const handleVerseDropComplete = () => {
    setVerseDropModalOpen(false);
    // Remove verse drop task
    setTasks(prev => prev.filter(t => t.type !== 'versedrop'));
  };

  const handleFlipComplete = async (timeSpent: number, moves: number) => {
    if (!selectedFlip) return;

    try {
      await fetch('/api/flip/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedFlip.id,
          pairsMatched: 8,
          moves,
          timeSpent,
          completed: true,
          won: true,
        }),
      });
      
      setFlipModalOpen(false);
      // Remove flip task
      setTasks(prev => prev.filter(t => t.type !== 'flip'));
    } catch (error) {
      console.error('Error completing flip game:', error);
    }
  };

  const handleInsightComplete = () => {
    setInsightModalOpen(false);
    // Remove insight task immediately
    setTasks(prev => prev.filter(t => t.type !== 'insight'));
  };

  if (!user || user.isAdmin) {
    return null;
  }

  // Separate point-earning tasks from collaboration wall
  const pointTasks = tasks.filter(t => t.type !== 'wall');
  const wallTasks = tasks.filter(t => t.type === 'wall');
  const activeTaskCount = pointTasks.length;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              📋 Today&apos;s Tasks
            </CardTitle>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {activeTaskCount} {activeTaskCount === 1 ? 'Task' : 'Tasks'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete tasks to earn points and grow in your Bible knowledge
          </p>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 pt-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading tasks...</p>
            </div>
          ) : pointTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                All tasks completed! 🎉
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Check back later for new tasks
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {pointTasks.map((task) => {
                const Icon = task.icon;
                const isFlipGame = task.type === 'flip';
                return (
                  <div
                    key={task.id}
                    className={`group rounded-lg border transition-all hover:shadow-md bg-white dark:bg-gray-800 active:scale-95 relative ${
                      isFlipGame
                        ? 'border-2 border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/50'
                        : 'border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                    }`}
                  >
                    {isFlipGame && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg transform rotate-12 z-10">
                        ⭐ BONUS
                      </div>
                    )}
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="w-full p-3 sm:p-4 text-left touch-manipulation cursor-pointer"
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-1">
                            {task.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {task.points}
                            </Badge>
                            {getTaskTimer(task) !== undefined && (
                              <Badge 
                                variant="destructive" 
                                className={`text-xs flex items-center gap-1 ${
                                  getTaskTimer(task)! < 60 ? 'animate-pulse' : ''
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {formatTime(getTaskTimer(task)!)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    {isFlipGame && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlipRulesModalOpen(true);
                          }}
                          className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors border border-amber-300 dark:border-amber-600"
                          type="button"
                        >
                          How to Play
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Collaboration Wall Section - Always visible if available */}
          {wallTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Collaboration Walls
              </h3>
              <div className="space-y-2">
                {wallTasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <div
                      key={task.id}
                      className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-md bg-white dark:bg-gray-800 active:scale-95"
                    >
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="w-full p-3 text-left touch-manipulation cursor-pointer"
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                              {task.title}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {task.description}
                            </p>
                          </div>

                          <div className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedWallId && (
        <>
          <ReadPortionModal
            isOpen={readPortionModalOpen}
            onClose={() => {
              setReadPortionModalOpen(false);
              setSelectedWallId(null);
            }}
            wallSessionId={selectedWallId}
            onListeningComplete={handleListeningComplete}
          />
          <CollaborationModal
            isOpen={collabModalOpen}
            onClose={() => {
              setCollabModalOpen(false);
              setSelectedWallId(null);
            }}
            wallSessionId={selectedWallId}
            onComplete={handleInsightComplete}
          />
        </>
      )}

      {selectedQuiz && (
        <QuizModal
          isOpen={quizModalOpen}
          onClose={() => {
            setQuizModalOpen(false);
            // Don't set selectedQuiz to null - keep component mounted for state persistence
          }}
          quiz={selectedQuiz}
          onComplete={handleQuizComplete}
        />
      )}

      {selectedWordle && (
        <WordleGameModal
          isOpen={wordleModalOpen}
          onClose={() => {
            setWordleModalOpen(false);
            // Don't set selectedWordle to null - keep component mounted for state persistence
          }}
          wordle={selectedWordle}
          onComplete={handleWordleComplete}
        />
      )}

      {selectedEmoji && (
        <EmojiGameModal
          isOpen={emojiModalOpen}
          onClose={() => {
            setEmojiModalOpen(false);
            // Don't set selectedEmoji to null - keep component mounted for state persistence
          }}
          game={selectedEmoji}
          onComplete={handleEmojiComplete}
        />
      )}

      {selectedVerseDrop && (
        <VerseDropGameModal
          isOpen={verseDropModalOpen}
          onClose={() => {
            setVerseDropModalOpen(false);
            // Don't set selectedVerseDrop to null - keep component mounted for state persistence
          }}
          game={selectedVerseDrop}
          onComplete={handleVerseDropComplete}
        />
      )}

      {selectedFlip && (
        <FlipGameModal
          isOpen={flipModalOpen}
          onClose={() => {
            setFlipModalOpen(false);
            // Don't set selectedFlip to null - keep component mounted for state persistence
          }}
          gameId={selectedFlip.id}
          gameData={selectedFlip}
          onComplete={handleFlipComplete}
        />
      )}

      {selectedWallId && selectedWallData && (
        <InsightSubmissionModal
          isOpen={insightModalOpen}
          onClose={() => {
            setInsightModalOpen(false);
            setSelectedWallId(null);
            setSelectedWallData(null);
          }}
          wallSessionId={selectedWallId}
          wallTitle={selectedWallData.title}
          passage={`${selectedWallData.BibleBook.name} ${selectedWallData.fromChapter}:${selectedWallData.fromVerse} - ${selectedWallData.toChapter}:${selectedWallData.toVerse}`}
          onComplete={handleInsightComplete}
        />
      )}

      <FlipGameRulesModal
        isOpen={flipRulesModalOpen}
        onClose={() => setFlipRulesModalOpen(false)}
      />
    </>
  );
}
