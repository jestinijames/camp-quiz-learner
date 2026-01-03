/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface QuizModalProps {
  quiz: {
    id: number;
    title: string;
    description?: string;
    book?: { name: string };
    fromChapter: number;
    fromVerse: number;
    toChapter: number;
    toVerse: number;
    timeLimit?: number;
  };
  onComplete: (result: any) => void;
}

type Question = {
  id: number;
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string;
  points: number;
  order: number;
};

type Answer = {
  questionId: number;
  response: string;
};

export function QuizModal({ quiz, onComplete }: QuizModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Reset and start quiz when modal opens
  const handleOpenQuiz = useCallback(async () => {
    setIsOpen(true);
    setLoading(true);
    setError('');
    setCurrentQuestion(0);
    setTabSwitchCount(0);
    setIsTabActive(true);
    setStartTime(Date.now());

    try {
      const response = await fetch(`/api/quiz/${quiz.id}/start`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.quiz.questions);
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
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [quiz.id]);

  // Enhanced security: Track tab visibility
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setTabSwitchCount(prev => prev + 1);
        
        if (tabSwitchCount >= 5) {
          console.warn('Too many tab switches detected');
        }
      } else {
        setIsTabActive(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, tabSwitchCount]);

  // Enhanced security: Prevent common shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        ['a', 'c', 'v', 'x', 's', 'p', 'f', 'h'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
      
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
      
      if (e.key === 'ContextMenu') {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

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
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || timeLeft === null || timeLeft <= 0 || submitting) return;

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
  }, [isOpen, timeLeft, submitting]);

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

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!sessionId || submitting) return;

    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers,
          timeSpent,
          tabSwitchCount
        })
      });

      if (response.ok) {
        const data = await response.json();
        onComplete(data);
        
        // Close modal after short delay
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit quiz');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, submitting, startTime, quiz.id, answers, tabSwitchCount, onComplete]);

  const progress = questions.length > 0 
    ? ((currentQuestion + 1) / questions.length) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQuestion];
  const currentAnswer = answers.find(a => a.questionId === currentQ?.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleOpenQuiz}
          className="w-full sm:w-auto sm:ml-4"
          size="sm"
        >
          Start Quiz
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[95vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl font-bold">
            {quiz.title}
          </DialogTitle>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {quiz.book?.name} {quiz.fromChapter}:{quiz.fromVerse} - {quiz.toChapter}:{quiz.toVerse}
            </p>
            <div className="flex flex-wrap justify-center gap-2 items-center">
              <Badge variant="outline">
                Question {currentQuestion + 1} of {questions.length}
              </Badge>
              {timeLeft !== null && (
                <Badge 
                  variant={timeLeft <= 60 ? "destructive" : "secondary"}
                  className={timeLeft <= 60 ? 'animate-pulse' : ''}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              )}
              {tabSwitchCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Switches: {tabSwitchCount}
                </Badge>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading quiz...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !isTabActive ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Please keep this tab active during the quiz. Tab switches are being monitored.
            </AlertDescription>
          </Alert>
        ) : currentQ ? (
          <div className="space-y-6 py-4">
            {/* Question Display */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-1">{currentQ.type.replace('_', ' ')}</Badge>
                <div className="flex-1">
                  <p className="text-base font-medium leading-relaxed">{currentQ.text}</p>
                  <p className="text-sm text-gray-500 mt-2">Points: {currentQ.points}</p>
                </div>
              </div>
            </Card>

            {/* Answer Input */}
            <div className="space-y-3">
              {currentQ.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  {getMultipleChoiceOptions(currentQ).map((option: string, idx: number) => (
                    <Button
                      key={idx}
                      variant={currentAnswer?.response === option ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-3 px-4"
                      onClick={() => updateAnswer(currentQ.id, option)}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      <span>{option}</span>
                    </Button>
                  ))}
                </div>
              )}

              {currentQ.type === 'FILL_IN_BLANK' && (
                <Input
                  value={currentAnswer?.response || ''}
                  onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                  placeholder="Type your answer..."
                  className="text-base"
                  autoFocus
                />
              )}

              {currentQ.type === 'DESCRIPTIVE' && (
                <Textarea
                  value={currentAnswer?.response || ''}
                  onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                  placeholder="Type your detailed answer..."
                  rows={6}
                  className="text-base"
                  autoFocus
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="flex-1"
              >
                Previous
              </Button>

              {currentQuestion < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  className="flex-1"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Answer Summary */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Progress:</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const answer = answers.find(a => a.questionId === q.id);
                  const hasAnswer = answer && answer.response.trim() !== '';
                  
                  return (
                    <Button
                      key={q.id}
                      variant={idx === currentQuestion ? "default" : hasAnswer ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentQuestion(idx)}
                      className="w-10 h-10 p-0"
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>;
}
