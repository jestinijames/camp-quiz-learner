'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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
          answers: answers.filter(a => a.response.trim() !== ''), // Only submit answered questions
          timeSpent
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to results or home page
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
    return <div>Access denied</div>;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">Loading quiz...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quiz Not Available</h2>
            <p className="text-gray-600 mb-4">{error || 'This quiz may have been closed or you may have already completed it.'}</p>
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{quiz.title}</CardTitle>
              {quiz.description && (
                <p className="text-gray-600 mt-2">{quiz.description}</p>
              )}
            </div>
            {timeLeft !== null && (
              <div className="text-right">
                <Badge variant={timeLeft < 300 ? 'destructive' : 'secondary'} className="text-lg px-3 py-1">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(getProgress())}% Complete</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {quiz.questions.map((q, index) => {
              const isAnswered = answers[index]?.response.trim() !== '';
              const isCurrent = index === currentQuestion;
              
              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestion(index)}
                  className="relative"
                >
                  {index + 1}
                  {isAnswered && (
                    <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Question {currentQ.order} of {quiz.questions.length}
            </CardTitle>
            <Badge variant="outline">
              {currentQ.points} points
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-lg whitespace-pre-wrap">{currentQ.text}</p>
          </div>

          {/* Answer Input Based on Question Type */}
          {currentQ.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-3">
              {getMultipleChoiceOptions(currentQ).map((option: string, index: number) => (
                <label key={index} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={answers[currentQuestion]?.response === option}
                    onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{String.fromCharCode(65 + index)}.</span>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQ.type === 'FILL_IN_BLANK' && (
            <Input
              value={answers[currentQuestion]?.response || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              placeholder="Type your answer here..."
              className="text-lg h-12"
            />
          )}

          {currentQ.type === 'DESCRIPTIVE' && (
            <Textarea
              value={answers[currentQuestion]?.response || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              placeholder="Write your detailed answer here..."
              rows={6}
              className="text-base"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation and Submit */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentQuestion === quiz.questions.length - 1 ? (
                <Button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  size="lg"
                  className="px-8"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}