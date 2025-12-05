import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>⚡ Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/quiz/create">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">📝</span>
              <span>Create Quiz</span>
            </Button>
          </Link>
          
          <Link href="/admin/wordle/create">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700">
              <span className="text-2xl">🔤</span>
              <span>Create Wordle</span>
            </Button>
          </Link>

          <Link href="/admin/teams">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <span className="text-2xl">👥</span>
              <span>Manage Teams</span>
            </Button>
          </Link>

          <Link href="/admin/bible">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <span className="text-2xl">📖</span>
              <span>Bible Data</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}