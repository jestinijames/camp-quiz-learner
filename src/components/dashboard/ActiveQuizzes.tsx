/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ActiveQuizzesProps {
  activeQuizzes: any[];
  closingQuiz: number | null;
  onCloseQuiz: (quizId: number, quizTitle: string) => void;
}

export function ActiveQuizzes({ activeQuizzes, closingQuiz, onCloseQuiz }: ActiveQuizzesProps) {
  if (activeQuizzes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🟢 Active Quizzes
          <Badge variant="default">{activeQuizzes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeQuizzes.map((quiz: any) => (
            <div key={quiz.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-green-800">{quiz.title}</h3>
                <p className="text-sm text-green-600">
                  {quiz.book?.name || 'Unknown Book'} {quiz.fromChapter}:{quiz.fromVerse} - {quiz.toChapter}:{quiz.toVerse}
                </p>
                <p className="text-xs text-green-500">
                  {quiz.totalSessions} submissions • 
                  Started: {new Date(quiz.startDate).toLocaleDateString()}
                  {quiz.needsCorrection && (
                    <span className="ml-2 text-red-600 font-medium">⚠ Needs correction</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {quiz.needsCorrection && (
                  <Link href={`/admin/quiz/${quiz.id}/corrections`}>
                    <Button size="sm" variant="outline">
                      Review Answers
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => onCloseQuiz(quiz.id, quiz.title)}
                  disabled={closingQuiz === quiz.id}
                  size="sm"
                  variant="destructive"
                >
                  {closingQuiz === quiz.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    <>🔒 Close Quiz</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}