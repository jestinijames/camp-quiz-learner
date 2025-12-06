'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

type Question = {
  id: number;
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string;
  points: number;
  order: number;
};

type Quiz = {
  id: number;
  title: string;
  description?: string;
  timeLimit?: number;
  questions: Question[];
};

type Answer = {
  questionId: number;
  response: string;
};

export default function QuizTakePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [startTime] = useState(Date.now());
  const [isTabActive, setIsTabActive] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Enhanced security: Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setTabSwitchCount(prev => prev + 1);
        
        // Optional: Auto-submit if too many tab switches
        if (tabSwitchCount >= 5) {
          console.warn('Too many tab switches detected');
          // handleSubmit(true);
        }
      } else {
        setIsTabActive(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabSwitchCount]);

  // Enhanced security: Prevent common shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common copy/paste shortcuts
      if (
        (e.ctrlKey || e.metaKey) && 
        ['a', 'c', 'v', 'x', 's', 'p', 'f', 'h'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
      
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
      
      // Prevent right-click context menu key
      if (e.key === 'ContextMenu') {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Start quiz session
  useEffect(() => {
    const startQuiz = async () => {
      try {
        const response = await fetch(`/api/quiz/${quizId}/start`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setQuiz(data.quiz);
          setSessionId(data.session.id);
          
          // Initialize answers array
          const initialAnswers = data.quiz.questions.map((q: Question) => ({
            questionId: q.id,
            response: ''
          }));
          setAnswers(initialAnswers);

          // Start timer if quiz has time limit
          if (data.quiz.timeLimit) {
            setTimeLeft(data.quiz.timeLimit * 60); // Convert to seconds
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to start quiz');
        }
      } catch (error) {
        setError('Failed to start quiz');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      startQuiz();
    }
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit(true); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const updateAnswer = (questionId: number, response: string) => {
    setAnswers(prev => 
      prev.map(answer => 
        answer.questionId === questionId 
          ? { ...answer, response }
          : answer
      )
    );
  };

  const getMultipleChoiceOptions = (question: Question) => {
    if (!question.options) return [];
    try {
      return JSON.parse(question.options);
    } catch {
      return [];
    }
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!sessionId) return;

    setSubmitting(true);
    setError('');

    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      const response = await fetch(`/api/quiz/session/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answers: answers.filter(a => a.response.trim() !== ''),
          timeSpent,
          tabSwitchCount // Track suspicious behavior
        })
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/?submitted=${quiz?.title}&score=${result.totalScore}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit quiz');
      }
    } catch (error) {
      setError('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const answeredCount = answers.filter(a => a.response.trim() !== '').length;
    return (answeredCount / (quiz?.questions.length || 1)) * 100;
  };

  if (!user || user.isAdmin) {
    return <div className="p-4 text-center">Access denied</div>;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base">Loading quiz...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Quiz Not Available</h2>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">{error || 'This quiz may have been closed or you may have already completed it.'}</p>
            <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Security Warning */}
      {!isTabActive && (
        <Alert variant="destructive">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Tab switching detected ({tabSwitchCount} times). Please stay focused on the quiz.
          </AlertDescription>
        </Alert>
      )}

      {/* Quiz Header */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl wrap-break-word">{quiz.title}</CardTitle>
              {quiz.description && (
                <p className="text-gray-600 mt-2 text-sm sm:text-base">{quiz.description}</p>
              )}
            </div>
            {timeLeft !== null && (
              <div className="shrink-0">
                <Badge 
                  variant={timeLeft < 300 ? 'destructive' : 'secondary'} 
                  className="text-sm sm:text-lg px-2 sm:px-3 py-1 w-full sm:w-auto text-center"
                >
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(getProgress())}% Complete</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {quiz.questions.map((q, index) => {
              const isAnswered = answers[index]?.response.trim() !== '';
              const isCurrent = index === currentQuestion;
              
              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestion(index)}
                  className="relative h-8 w-full text-xs sm:text-sm"
                >
                  {index + 1}
                  {isAnswered && (
                    <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 absolute -top-0.5 -right-0.5 text-green-500 bg-white rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Question - PROTECTED CONTENT */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <CardTitle className="text-base sm:text-lg">
              Question {currentQ.order} of {quiz.questions.length}
            </CardTitle>
            <Badge variant="outline" className="w-fit">
              {currentQ.points} points
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* PROTECTED QUESTION TEXT */}
          <div 
            className="prose max-w-none select-none"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <p className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed font-medium">
              {currentQ.text}
            </p>
          </div>

          {/* Answer Input Based on Question Type */}
          {currentQ.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2 sm:space-y-3">
              {getMultipleChoiceOptions(currentQ).map((option: string, index: number) => (
                <label 
                  key={index} 
                  className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                >
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={answers[currentQuestion]?.response === option}
                    onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                    className="h-4 w-4 mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-sm sm:text-base wrap-break-word">{option}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {currentQ.type === 'FILL_IN_BLANK' && (
            <Input
              value={answers[currentQuestion]?.response || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              placeholder="Type your answer here..."
              className="text-base sm:text-lg h-10 sm:h-12"
              autoComplete="off"
              spellCheck="false"
            />
          )}

          {currentQ.type === 'DESCRIPTIVE' && (
            <Textarea
              value={answers[currentQuestion]?.response || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              placeholder="Write your detailed answer here..."
              rows={4}
              className="text-sm sm:text-base min-h-[100px] resize-none"
              autoComplete="off"
              spellCheck="false"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation and Submit */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              size="sm"
              className="px-3 sm:px-4"
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentQuestion === quiz.questions.length - 1 ? (
                <Button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  size="sm"
                  className="px-4 sm:px-8"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                  size="sm"
                  className="px-3 sm:px-4"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}