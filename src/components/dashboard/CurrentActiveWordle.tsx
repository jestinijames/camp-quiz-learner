/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface CurrentActiveWordleProps {
  activeWordle: any;
}

export function CurrentActiveWordle({ activeWordle }: CurrentActiveWordleProps) {
  if (!activeWordle) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔤 Current Active Wordle
          <Badge variant="secondary">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800">{activeWordle.title}</h3>
              <p className="text-blue-600">Answer: <span className="font-bold tracking-wider">{activeWordle.word}</span></p>
              <p className="text-sm text-blue-600">From: {activeWordle.book?.name || activeWordle.book || 'Unknown Book'}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{activeWordle.attempts}</div>
              <div className="text-sm text-blue-600">Attempts</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}