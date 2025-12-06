/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, use } from 'react'; // Add 'use' import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

import { CheckCircle, XCircle, Clock, Users, Award, Zap, BookOpen, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { correctAllDescriptiveAnswers } from '../../../../../../lib/ollamaCorrection';

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
};

export default function QuizCorrectionPage({ 
  params 
}: { 
  params: Promise<{ quizId: string }> 
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);

  const [quiz, setQuiz] = useState<any>(null);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // FIXED: Unwrap the params Promise
  const resolvedParams = use(params);
  const quizId = parseInt(resolvedParams.quizId);

  // Load quiz correction data
  useEffect(() => {
    const fetchCorrectionData = async () => {
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

    fetchCorrectionData();
  }, [quizId]);

  // Auto-correct all descriptive answers
  const handleAutoCorrection = async () => {
    setCorrecting(true);
    setError('');
    setSuccess('');

    try {
      const result = await correctAllDescriptiveAnswers(quizId);
      
      if (result.errors.length > 0) {
        setError(`Correction completed with errors: ${result.errors.join(', ')}`);
      } else {
        setSuccess(`✅ Successfully corrected ${result.corrected} descriptive answers!`);
      }

      // Reload data
      const response = await fetch(`/api/admin/quiz/${quizId}/corrections`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setStats(data.stats);
      }

    } catch (error: any) {
      setError(`Auto-correction failed: ${error.message}`);
    } finally {
      setCorrecting(false);
    }
  };

  // Generate trivia and insights
  // const handleTriviaGeneration = async () => {
  //   setGeneratingTrivia(true);
  //   setError('');

  //   try {
  //     const response = await fetch(`/api/admin/quiz/${quizId}/generate-trivia`, {
  //       method: 'POST'
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       setSuccess(`🎯 Generated ${result.triviaCount} trivia items from quiz results!`);
  //     } else {
  //       const errorData = await response.json();
  //       setError(errorData.error || 'Failed to generate trivia');
  //     }
  //   } catch (error: any) {
  //     setError(`Trivia generation failed: ${error.message}`);
  //   } finally {
  //     setGeneratingTrivia(false);
  //   }
  // };

  // Manual score override
  const handleManualScore = async (answerId: number, newPoints: number, feedback?: string) => {
    try {
      const response = await fetch(`/api/admin/answer/${answerId}/update-score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints, feedback })
      });

      if (response.ok) {
        // Update local state
        setSessions(prev => prev.map(session => ({
          ...session,
          answers: session.answers.map(answer => 
            answer.id === answerId 
              ? { ...answer, points: newPoints, feedback }
              : answer
          )
        })));
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
            <Badge variant="outline">
              {quiz?.book?.name} {quiz?.fromChapter}:{quiz?.fromVerse}-{quiz?.toChapter}:{quiz?.toVerse}
            </Badge>
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
                  <p className="text-sm text-gray-500">Total Participants</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Fully Corrected</p>
                  <p className="text-2xl font-bold">{stats.correctedSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingCorrections}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Descriptive Answers</p>
                  <p className="text-2xl font-bold">{stats.totalDescriptiveAnswers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <Button
          onClick={handleAutoCorrection}
          disabled={correcting || stats?.pendingCorrections === 0}
          className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" // FIXED: CSS class
        >
          {correcting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>AI Correcting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>Auto-Correct All Descriptive ({stats?.totalDescriptiveAnswers})</span>
            </div>
          )}
        </Button>

        {/* <Button
          onClick={handleTriviaGeneration}
          disabled={generatingTrivia}
          variant="outline"
          className="border-green-500 text-green-700 hover:bg-green-50"
        >
          {generatingTrivia ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
              <span>Generating...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Generate Learning Trivia</span>
            </div>
          )}
        </Button> */}
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

      {/* Member Answers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Member Answers</h3>
        
        {sessions.map((session) => (
          <Card key={session.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{session.member.name}</span>
                  <Badge variant="outline">{session.member.team.name}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {session.totalScore !== null && (
                    <Badge className="bg-green-100 text-green-800">
                      Score: {session.totalScore}
                    </Badge>
                  )}
                  {!session.isSubmitted && (
                    <Badge variant="destructive">Not Submitted</Badge>
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

                    {/* Manual Score Override (for descriptive questions) */}
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
        ))}
      </div>
    </div>
  );
}