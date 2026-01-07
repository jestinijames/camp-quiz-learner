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
          <Link href="/admin/pending-members">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-orange-600 hover:bg-orange-700">
              <span className="text-2xl">✅</span>
              <span>Approve Members</span>
            </Button>
          </Link>

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

          <Link href="/admin/emoji/create">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-purple-600 hover:bg-purple-700">
              <span className="text-2xl">😀</span>
              <span>Create Emoji Game</span>
            </Button>
          </Link>

          <Link href="/admin/verse-drop/create">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-cyan-600 hover:bg-cyan-700 text-white">
              <span className="text-2xl">💧</span>
              <span className="text-sm font-medium">Create Verse Drop</span>
            </Button>
          </Link>

          <Link href="/admin/collaboration-walls/create">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700">
              <span className="text-2xl">🧱</span>
              <span>Create Collaboration Wall</span>
            </Button>
          </Link>

          <Link href="/admin/collaboration-walls/view">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-teal-600 hover:bg-teal-700 text-white">
              <span className="text-2xl">👁️</span>
              <span className="text-sm font-medium">View Wall Cards</span>
            </Button>
          </Link>

          <Link href="/admin/teams">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <span className="text-2xl">👥</span>
              <span>Manage Teams</span>
            </Button>
          </Link>

          <Link href="/admin/teams/manage-scores">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <span className="text-2xl">🎯</span>
              <span className="text-sm font-medium">Adjust Team Scores</span>
            </Button>
          </Link>

          <Link href="/admin/bible">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2" variant="outline">
              <span className="text-2xl">📖</span>
              <span>Bible Data</span>
            </Button>
          </Link>

          <Link href="/admin/activity-log">
            <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2 bg-red-600 hover:bg-red-700">
              <span className="text-2xl">🔍</span>
              <span>Activity Audit</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}