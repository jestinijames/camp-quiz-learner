/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Users, Award, BookOpen, Bot, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type QuizSession = {
  id: number;
  member: {
    name: string;
    team: {
      name: string;
    };
  };
  answers: {
    id: number;
    question: {
      text: string;
      type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
      answer: string;
      points: number;
      verseRef: string;
    };
    response: string;
    isCorrect: boolean | null;
    points: number | null;
    feedback?: string;
  }[];
  totalScore: number | null;
  isSubmitted: boolean;
};

type CorrectionStats = {
  totalSessions: number;
  correctedSessions: number;
  pendingCorrections: number;
  totalDescriptiveAnswers: number;
  sessionsWithoutTrivia: number;
};

export default function QuizCorrectionPage({ 
  params 
}: { 
  params: Promise<{ quizId: string }> 
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [closingQuiz, setClosingQuiz] = useState(false);

  const [quiz, setQuiz] = useState<any>(null);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resolvedParams = use(params);
  const quizId = parseInt(resolvedParams.quizId);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/corrections`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data.quiz);
        setSessions(data.sessions);
        setStats(data.stats);
      } else {
        setError('Failed to load correction data');
      }
    } catch (error) {
      setError(`Failed to connect to server: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quizId]);

  const handleAutoCorrection = async () => {
    setCorrecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/correct-all`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        if (result.remaining > 0) {
          setSuccess(`✅ Corrected ${result.corrected} answers. ${result.remaining} remaining. Click again to continue.`);
        } else {
          setSuccess(`🎉 All ${result.corrected} descriptive answers corrected successfully!`);
        }

        // Reload data
        await fetchData();
      } else {
        setError(result.error || 'Correction failed');
      }

    } catch (error: any) {
      setError(`Auto-correction failed: ${error.message}`);
    } finally {
      setCorrecting(false);
    }
  };



  const handleCloseQuiz = async () => {
    if (!confirm('Are you sure you want to close this quiz? This cannot be undone.')) {
      return;
    }

    setClosingQuiz(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/close`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`🎉 Quiz "${result.quiz.title}" closed successfully!`);
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Failed to close quiz');
      }

    } catch (error: any) {
      setError(`Failed to close quiz: ${error.message}`);
    } finally {
      setClosingQuiz(false);
    }
  };

  const handleManualScore = async (answerId: number, newPoints: number, feedback?: string) => {
    try {
      // If no feedback provided, set default to indicate manual correction
      const finalFeedback = feedback || `Manually corrected by admin. Score: ${newPoints} points.`;
      
      const response = await fetch(`/api/admin/answer/${answerId}/update-score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints, feedback: finalFeedback })
      });

      if (response.ok) {
        setSessions(prev => prev.map(session => ({
          ...session,
          answers: session.answers.map(answer => 
            answer.id === answerId 
              ? { ...answer, points: newPoints, feedback: finalFeedback }
              : answer
          )
        })));
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to update score:', error);
    }
  };

  const getAnswerStatus = (answer: QuizSession['answers'][0]) => {
    if (answer.question.type !== 'DESCRIPTIVE') {
      return answer.isCorrect ? 'correct' : 'incorrect';
    }
    
    if (answer.points === null) return 'pending';
    if (answer.points === 0) return 'incorrect';
    if (answer.points === answer.question.points) return 'correct';
    return 'partial';
  };

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  if (loading) {
    return <div className="p-6">Loading correction data...</div>;
  }

  const allCorrectionsDone = stats?.pendingCorrections === 0;
  const canCloseQuiz = allCorrectionsDone;

  // Tab 1: Pending Review - Only show questions awaiting review
  const pendingSessions = sessions.map(session => ({
    ...session,
    answers: session.answers.filter(answer => 
      answer.question.type === 'DESCRIPTIVE' && 
      answer.feedback === 'Awaiting manual review'
    )
  })).filter(session => session.answers.length > 0);

  // Tab 2: All Corrections - Show all corrected descriptive questions (AI or manual)
  const correctedSessions = sessions.map(session => ({
    ...session,
    answers: session.answers.filter(answer => 
      answer.question.type === 'DESCRIPTIVE' && 
      answer.feedback !== 'Awaiting manual review'
    )
  })).filter(session => session.answers.length > 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span>{quiz?.title} - Correction Center</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {quiz?.book?.name} {quiz?.fromChapter}:{quiz?.fromVerse}-{quiz?.toChapter}:{quiz?.toVerse}
              </Badge>
              {quiz?.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Closed</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Correction Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Descriptive</p>
                  <p className="text-2xl font-bold">{stats.totalDescriptiveAnswers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">AI Corrected</p>
                  <p className="text-2xl font-bold">{stats.totalDescriptiveAnswers - stats.pendingCorrections}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-2xl font-bold">{stats.pendingCorrections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        {/* Step 1: Auto-Correct */}
        <Button
          onClick={handleAutoCorrection}
          disabled={correcting || allCorrectionsDone}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {correcting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Correcting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>
                {allCorrectionsDone 
                  ? '✓ All Corrected' 
                  : `Step 1: Auto-Correct (${stats?.pendingCorrections} left)`
                }
              </span>
            </div>
          )}
        </Button>

        {/* Step 2: Close Quiz */}
        <Button
          onClick={handleCloseQuiz}
          disabled={!canCloseQuiz || closingQuiz || !quiz?.isActive}
          variant={canCloseQuiz ? "destructive" : "outline"}
          className="disabled:opacity-50"
        >
          {closingQuiz ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Closing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {canCloseQuiz ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span>
                {!quiz?.isActive 
                  ? 'Quiz Already Closed'
                  : canCloseQuiz 
                    ? 'Step 2: Close Quiz' 
                    : 'Close Quiz (Complete Step 1)'
                }
              </span>
            </div>
          )}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabbed Interface */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending Review
            {stats && stats.pendingCorrections > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white">
                {stats.pendingCorrections}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="corrected">
            All Corrections
            {stats && stats.totalDescriptiveAnswers - stats.pendingCorrections > 0 && (
              <Badge className="ml-2 bg-green-500 text-white">
                {stats.totalDescriptiveAnswers - stats.pendingCorrections}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending Review */}
        <TabsContent value="pending" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Questions Awaiting Correction</h3>
            
            {pendingSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                      <p className="text-gray-600">
                        No descriptive questions awaiting correction. All questions have been reviewed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              pendingSessions.map((session) => (
                <Card key={session.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{session.member.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {session.totalScore !== null && (
                          <Badge className="bg-green-100 text-green-800">
                            Score: {session.totalScore}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {session.answers.map((answer) => (
                        <div key={answer.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="outline">{answer.question.type}</Badge>
                                {answer.question.verseRef && (
                                  <Badge variant="outline" className="text-xs">
                                    {answer.question.verseRef}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{answer.question.text}</p>
                              <p className="text-sm text-green-600 mt-1">
                                <strong>Expected:</strong> {answer.question.answer}
                              </p>
                              <p className="text-sm text-blue-600 mt-1">
                                <strong>Member Answer:</strong> {answer.response}
                              </p>
                              {answer.feedback && answer.feedback !== 'Awaiting manual review' && (
                                <p className="text-sm text-purple-600 mt-1">
                                  <strong>Feedback:</strong> {answer.feedback}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <Clock className="h-5 w-5 text-yellow-500" />
                            </div>
                          </div>

                          {/* Manual Score Input */}
                          <div className="mt-3 p-3 bg-gray-50 rounded border">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Enter Score:</span>
                              <Input
                                type="number"
                                min="0"
                                max={answer.question.points}
                                placeholder={`0-${answer.question.points}`}
                                className="w-20 h-8"
                                defaultValue={answer.points || ''}
                                onBlur={(e) => {
                                  const newPoints = parseInt(e.target.value) || 0;
                                  if (newPoints !== answer.points) {
                                    handleManualScore(answer.id, newPoints);
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-500">/{answer.question.points} pts</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 2: All Corrections */}
        <TabsContent value="corrected" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">All Corrected Questions (Review & Adjust)</h3>
            
            {correctedSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Clock className="h-16 w-16 text-gray-400" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No Corrections Yet</h3>
                      <p className="text-gray-600">
                        Corrected questions will appear here after you use auto-correct or manually score them.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              correctedSessions.map((session) => (
          <Card key={session.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{session.member.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {session.totalScore !== null && (
                    <Badge className="bg-green-100 text-green-800">
                      Score: {session.totalScore}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {session.answers.map((answer) => (
                  <div key={answer.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline">{answer.question.type}</Badge>
                          {answer.question.verseRef && (
                            <Badge variant="outline" className="text-xs">
                              {answer.question.verseRef}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{answer.question.text}</p>
                        <p className="text-sm text-green-600 mt-1">
                          <strong>Expected:</strong> {answer.question.answer}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          <strong>Member Answer:</strong> {answer.response}
                        </p>
                        {answer.feedback && (
                          <p className="text-sm text-purple-600 mt-1">
                            <strong>Feedback:</strong> {answer.feedback}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {getAnswerStatus(answer) === 'correct' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {getAnswerStatus(answer) === 'incorrect' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {getAnswerStatus(answer) === 'partial' && (
                          <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                        )}
                        {getAnswerStatus(answer) === 'pending' && (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>

                    {/* Manual Score Override */}
                    {answer.question.type === 'DESCRIPTIVE' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Manual Override:</span>
                          <Input
                            type="number"
                            min="0"
                            max={answer.question.points}
                            placeholder={`0-${answer.question.points}`}
                            className="w-20 h-8"
                            defaultValue={answer.points || ''}
                            onBlur={(e) => {
                              const newPoints = parseInt(e.target.value) || 0;
                              if (newPoints !== answer.points) {
                                handleManualScore(answer.id, newPoints);
                              }
                            }}
                          />
                          <span className="text-sm text-gray-500">/{answer.question.points} pts</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}