/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ActiveWordlesProps {
  activeWordles: any[];
  closingWordle: number | null;
  onCloseWordle: (wordleId: number, wordleTitle: string) => void;
}

export function ActiveWordles({ activeWordles, closingWordle, onCloseWordle }: ActiveWordlesProps) {
  if (activeWordles.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🟢 Active Wordles
          <Badge variant="default">{activeWordles.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeWordles.map((wordle: any) => (
            <div key={wordle.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-green-800">{wordle.title}</h3>
                <p className="text-sm text-green-600">
                  Word: <span className="font-mono font-bold">{wordle.word}</span> • From: {wordle.book?.name || wordle.book || 'Unknown Book'}
                </p>
                <p className="text-xs text-green-500">
                  {wordle.wordleAttempts?.length || 0} attempts • 
                  {wordle.wordleAttempts?.filter((a: any) => a.won).length || 0} wins • 
                  Created: {new Date(wordle.createdDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onCloseWordle(wordle.id, wordle.title)}
                  disabled={closingWordle === wordle.id}
                  size="sm"
                  variant="destructive"
                >
                  {closingWordle === wordle.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    <>🔒 Close Wordle</>
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