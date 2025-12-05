'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

type TriviaItem = {
  id: number;
  type: 'ENCOURAGEMENT' | 'INSIGHT' | 'CHALLENGE';
  title: string;
  content: string;
  insight?: string;
  studyTips?: string;
  suggestedReading?: string;
  createdAt: string;
};

type User = {
  isAdmin: boolean;
};

interface PersonalTriviaProps {
  user: User | null;
}

export function PersonalTrivia({ user }: PersonalTriviaProps) {
  const [personalTrivia, setPersonalTrivia] = useState<TriviaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPersonalTrivia = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/personal-trivia');
        if (response.ok) {
          const trivia = await response.json();
          console.log('Personal trivia loaded:', trivia);
          setPersonalTrivia(trivia);
        } else {
          console.error('Failed to fetch trivia:', await response.text());
        }
      } catch (error) {
        console.error('Failed to load trivia:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalTrivia();
  }, [user]);

  // Don't render for admin users or if no trivia
  if (!user || user.isAdmin || personalTrivia.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading your personal Bible journey...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">🎯 Your Personal Bible Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {personalTrivia.map((item, index) => (
            <div
              key={index}
              className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                item.type === 'ENCOURAGEMENT'
                  ? 'border-l-green-500 bg-green-50'
                  : item.type === 'INSIGHT'
                  ? 'border-l-blue-500 bg-blue-50'
                  : 'border-l-orange-500 bg-orange-50'
              }`}
            >
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base break-words">
                {item.title}
              </h4>
              <p className="text-gray-700 mb-3 text-sm sm:text-base leading-relaxed">
                {item.content}
              </p>

              {item.insight && (
                <div className="bg-white p-2 sm:p-3 rounded border-l-2 border-l-purple-300 mb-3">
                  <p className="text-purple-700 text-xs sm:text-sm font-medium">💝 Personal Note:</p>
                  <p className="text-purple-600 text-xs sm:text-sm leading-relaxed">{item.insight}</p>
                </div>
              )}

              {item.studyTips && (
                <div className="bg-blue-50 p-2 sm:p-3 rounded border-l-2 border-l-blue-300 mb-3">
                  <p className="text-blue-700 text-xs sm:text-sm font-medium">📖 Study Action:</p>
                  <p className="text-blue-600 text-xs sm:text-sm leading-relaxed">{item.studyTips}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mt-3">
                {item.suggestedReading && (
                  <Badge variant="outline" className="text-xs w-fit">
                    📖 {item.suggestedReading}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}