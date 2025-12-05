/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface WordleManagementProps {
  allWordles: any[];
}

export function WordleManagement({ allWordles }: WordleManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🔤 Wordle Management
          <Link href="/admin/wordle/create">
            <Button size="sm">Create New Wordle</Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allWordles.slice(0, 10).map((wordle: any) => (
            <div key={wordle.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{wordle.title}</h3>
                <p className="text-sm text-gray-600">
                  Word: <span className="font-mono font-bold">{wordle.word}</span> • 
                  {wordle.book?.name || wordle.book || 'Unknown Book'} • 
                  {wordle.wordleAttempts?.length || 0} attempts
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(wordle.createdDate).toLocaleDateString()}
                  {wordle.isActive ? (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">Closed</Badge>
                  )}
                </p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {wordle.wordleAttempts?.filter((a: any) => a.won).length || 0}/
                  {wordle.wordleAttempts?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Win Rate</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}