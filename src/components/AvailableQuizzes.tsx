/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { QuizModal } from './QuizModal';

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
  questions?: any[];
  createdAt: string;
};

type User = {
  isAdmin: boolean;
};

interface AvailableQuizzesProps {
  user: User | null;
}

export function AvailableQuizzes({ user }: AvailableQuizzesProps) {
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuizzes = async () => {
    if (!user || user.isAdmin) return;

    setLoading(true);
    try {
      const response = await fetch('/api/quiz/available', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const quizzes = await response.json();
        setAvailableQuizzes(quizzes);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const handleQuizComplete = (result: any) => {
    console.log('Quiz completed:', result);
    // Refresh the quiz list to update status
    fetchQuizzes();
  };

  // Don't render for admin users
  if (!user || user.isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">📋 Available Quizzes</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading quizzes...</p>
          </div>
        ) : availableQuizzes.length > 0 ? (
          <div className="space-y-3">
            {availableQuizzes.map((quiz) => (
              <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-white space-y-3 sm:space-y-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-lg wrap-break-word leading-tight">
                    {quiz.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                    {quiz.book?.name} {quiz.fromChapter}:{quiz.fromVerse} - {quiz.toChapter}:{quiz.toVerse}
                  </p>
                </div>
                <QuizModal 
                  quiz={quiz}
                  onComplete={handleQuizComplete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <p className="text-gray-500 text-sm sm:text-base">No quizzes available right now.</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Check back later for new Bible quizzes!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}