/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface QuizzesNeedingCorrectionProps {
  quizzes: any[];
}

export function QuizzesNeedingCorrection({ quizzes }: QuizzesNeedingCorrectionProps) {
  if (quizzes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚨 Quizzes Needing Correction
          <Badge variant="destructive">{quizzes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quizzes.map((quiz: any) => (
            <div key={quiz.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-red-800">{quiz.title}</h3>
                <p className="text-sm text-red-600">
                  {quiz.book?.name || 'Unknown Book'} • {quiz.uncorrectedAnswers} uncorrected answers
                </p>
              </div>
              <Link href={`/admin/quiz/${quiz.id}/corrections`}>
                <Button size="sm" variant="destructive">
                  Review Answers
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}