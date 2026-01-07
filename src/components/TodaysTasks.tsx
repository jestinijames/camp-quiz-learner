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
import { InsightSubmissionModal } from './InsightSubmissionModal';
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
  Droplets
} from 'lucide-react';

type WallSession = {
  id: number;
  title: string;
  description: string | null;
  book: {
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  _count: {
    cards: number;
  };
};

type Quiz = {
  id: number;
  title: string;
  description?: string;
  book?: {
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  timeLimit?: number;
  _count?: {
    questions: number;
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
  type: 'passage' | 'quiz' | 'wordle' | 'emoji' | 'wall' | 'insight' | 'versedrop';
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [readPortionModalOpen, setReadPortionModalOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [wordleModalOpen, setWordleModalOpen] = useState(false);
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);
  const [verseDropModalOpen, setVerseDropModalOpen] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  
  const [selectedWallId, setSelectedWallId] = useState<number | null>(null);
  const [selectedWallData, setSelectedWallData] = useState<WallSession | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedWordle, setSelectedWordle] = useState<Wordle | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiGame | null>(null);
  const [selectedVerseDrop, setSelectedVerseDrop] = useState<any>(null);

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
              description: `${wall.book.name} ${wall.fromChapter}:${wall.fromVerse} - ${wall.toChapter}:${wall.toVerse}`,
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
            // Check if current user has submitted any card
            hasSubmittedInsight = cards.some((card: any) => card.author.id === user.id);
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
            description: `${wall._count.cards} insights shared`,
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
          const maxPoints = (quiz._count?.questions || 0) * 10;
          taskList.push({
            id: `quiz-${quiz.id}`,
            type: 'quiz',
            title: "Today's Quiz Challenge",
            description: `${quiz.book?.name} ${quiz.fromChapter}:${quiz.fromVerse} - ${quiz.toChapter}:${quiz.toVerse}`,
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
            points: '+2 to +6 points',
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
                return (
                  <div
                    key={task.id}
                    className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md bg-white dark:bg-gray-800 active:scale-95"
                  >
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
                          <Badge variant="secondary" className="text-xs mt-2">
                            {task.points}
                          </Badge>
                        </div>

                        <div className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
            setSelectedQuiz(null);
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
            setSelectedWordle(null);
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
            setSelectedEmoji(null);
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
            setSelectedVerseDrop(null);
          }}
          game={selectedVerseDrop}
          onComplete={handleVerseDropComplete}
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
          passage={`${selectedWallData.book.name} ${selectedWallData.fromChapter}:${selectedWallData.fromVerse} - ${selectedWallData.toChapter}:${selectedWallData.toVerse}`}
          onComplete={handleInsightComplete}
        />
      )}
    </>
  );
}
