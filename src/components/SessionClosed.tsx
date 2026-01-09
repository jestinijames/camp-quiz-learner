'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Lock, Clock } from 'lucide-react';

interface SessionClosedProps {
  message?: string;
}

export function SessionClosed({ message }: SessionClosedProps) {
  const displayMessage = message || 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-orange-800 dark:text-orange-200">
            <Lock className="h-8 w-8" />
            <span>Session Closed</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-lg text-orange-900 dark:text-orange-100 font-medium">
                {displayMessage}
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                The admin is currently preparing new activities and games. Your dashboard will be available again shortly.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
              What to do now?
            </h3>
            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
              <li>Check back in a few minutes</li>
              <li>Refresh your page to see if the session has reopened</li>
              <li>Use this time to review previous learnings</li>
            </ul>
          </div>

          <div className="text-center text-sm text-orange-600 dark:text-orange-400">
            🙏 Thank you for your patience!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
