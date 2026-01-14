'use client';

import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

type MyAnswer = {
  questionText: string;
  questionType: string;
  myAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  feedback: string;
  verseRef: string;
  options: string[] | null;
};

type OtherQuestion = {
  text: string;
  type: string;
  answer: string;
  verseRef: string;
  options: string[] | null;
};

type QuizReview = {
  sessionId: number;
  quizTitle: string;
  bookName: string;
  reference: string;
  completedAt: string;
  totalScore: number | null;
  myAnswers: MyAnswer[];
  otherQuestions: OtherQuestion[];
};

type User = {
  isAdmin: boolean;
};

interface QuizReviewSectionProps {
  user: User | null;
}

export function QuizReviewSection({ user }: QuizReviewSectionProps) {
  const [reviews, setReviews] = useState<QuizReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<{ [key: number]: boolean }>({ 0: true });
  const [expandedAnswers, setExpandedAnswers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchReview = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/quiz-review', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error('Failed to load quiz review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [user]);

  if (!user || user.isAdmin || reviews.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading your quiz review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          📚 Your Bible Quiz Review
        </h2>
        <p className="text-sm sm:text-base text-blue-100 mt-1">
          {reviews.length} quiz{reviews.length !== 1 ? 'zes' : ''} completed
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {reviews.map((review, sessionIndex) => (
          <Collapsible
            key={review.sessionId}
            open={expandedSessions[sessionIndex]}
            onOpenChange={(open) => setExpandedSessions(prev => ({ ...prev, [sessionIndex]: open }))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
          >
            {/* Quiz Header */}
            <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl sm:text-2xl">🎯</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    {review.quizTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      📖 {review.bookName} {review.reference}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-gray-400 dark:text-gray-500 ml-2 shrink-0 text-lg">
                {expandedSessions[sessionIndex] ? '▲' : '▼'}
              </span>
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t border-gray-200 dark:border-gray-700">
              <div className="p-4 space-y-6">
                {/* My Answers Section */}
                <div>
                  <h4 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                    <span>📖</span> Questions You Were Asked
                  </h4>
                  <div className="space-y-2">
                    {review.myAnswers.map((answer, idx) => {
                      const answerKey = `${sessionIndex}-${idx}`;
                      const isExpanded = expandedAnswers[answerKey];
                      
                      return (
                        <Collapsible
                          key={idx}
                          open={isExpanded}
                          onOpenChange={(open) => setExpandedAnswers(prev => ({ ...prev, [answerKey]: open }))}
                          className="border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10"
                        >
                          <CollapsibleTrigger className="w-full p-3 text-left flex items-start gap-2 hover:opacity-80">
                            <span className="text-lg shrink-0">📝</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {answer.questionText}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {answer.verseRef}
                              </p>
                            </div>
                            <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="px-3 pb-3 space-y-2 text-sm">
                            <div>
                              <span className="font-semibold text-blue-700 dark:text-blue-300">Answer: </span>
                              <span className="text-gray-700 dark:text-gray-300">{answer.correctAnswer}</span>
                            </div>
                            {answer.options && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                <span className="font-semibold">Options: </span>
                                {answer.options.join(', ')}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>

                {/* Questions Others Got Section */}
                {review.otherQuestions.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                      <span>📝</span> Questions Others Got (Study These!)
                    </h4>
                    <div className="space-y-3">
                      {review.otherQuestions.map((q, idx) => (
                        <div key={idx} className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/10">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {q.text}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {q.verseRef}
                          </p>
                          <div className="text-sm">
                            <span className="font-semibold text-blue-700 dark:text-blue-300">Answer: </span>
                            <span className="text-gray-700 dark:text-gray-300">{q.answer}</span>
                          </div>
                          {q.options && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-semibold">Options: </span>
                              {q.options.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-center text-gray-700 dark:text-gray-300">
          💪 <strong>Keep Learning:</strong> Review your answers and study the questions others got to master the portion!
        </p>
      </div>
    </div>
  );
}
