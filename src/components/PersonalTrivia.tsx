'use client';

import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type TriviaItem = {
  id: number;
  type: 'ENCOURAGEMENT' | 'INSIGHT' | 'STUDY_TIP' | 'COMMON_MISTAKE' | 'BIBLICAL_CONNECTION' | 'CHALLENGE';
  title: string;
  content: string;
  suggestedReading?: string;
  createdAt: string;
};

type SessionTrivia = {
  sessionId: number;
  quizTitle: string;
  bookName: string;
  completedAt: string;
  totalScore: number | null;
  triviaItems: TriviaItem[];
};

type User = {
  isAdmin: boolean;
};

interface PersonalTriviaProps {
  user: User | null;
}

export function PersonalTrivia({ user }: PersonalTriviaProps) {
  const [triviaSessions, setTriviaSessions] = useState<SessionTrivia[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<{ [key: number]: boolean }>({ 0: true }); // First session open by default
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({ '0-0': true, '0-1': true }); // First 2 items open

  useEffect(() => {
    const fetchPersonalTrivia = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/personal-trivia');
        if (response.ok) {
          const sessions = await response.json();
          setTriviaSessions(sessions);
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
  if (!user || user.isAdmin || triviaSessions.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-lg">
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading your Bible learning journey...</p>
        </div>
      </div>
    );
  }

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'ENCOURAGEMENT':
        return 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20';
      case 'COMMON_MISTAKE':
        return 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20';
      case 'INSIGHT':
        return 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20';
      case 'STUDY_TIP':
        return 'border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20';
      case 'CHALLENGE':
        return 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20';
      case 'BIBLICAL_CONNECTION':
        return 'border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20';
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENCOURAGEMENT': return '✅';
      case 'COMMON_MISTAKE': return '❌';
      case 'INSIGHT': return '📊';
      case 'STUDY_TIP': return '📚';
      case 'CHALLENGE': return '🎯';
      case 'BIBLICAL_CONNECTION': return '🔗';
      default: return '📖';
    }
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '---') {
        return <hr key={index} className="my-4 border-gray-300 dark:border-gray-600" />;
      }
      
      if (trimmedLine === '') {
        return <br key={index} />;
      }
      
      const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
      
      return (
        <p key={index} className="mb-2 leading-relaxed text-sm sm:text-base">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIndex} className="font-semibold text-gray-900 dark:text-gray-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={partIndex} className="text-gray-700 dark:text-gray-300">{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg">
      <div className="p-4 sm:p-6 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          📖 Your Bible Learning Journey
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
          {triviaSessions.length} quiz session{triviaSessions.length !== 1 ? 's' : ''} completed
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {triviaSessions.map((session, sessionIndex) => (
          <Collapsible
            key={session.sessionId}
            open={expandedSessions[sessionIndex]}
            onOpenChange={(open) => setExpandedSessions(prev => ({ ...prev, [sessionIndex]: open }))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
          >
            {/* Session Header */}
            <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-left transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl sm:text-2xl">🎯</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    {session.quizTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      📖 {session.bookName}
                    </span>
                    {session.totalScore !== null && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        Score: {session.totalScore}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(session.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-gray-400 dark:text-gray-500 ml-2 shrink-0 text-lg">
                  {expandedSessions[sessionIndex] ? '▲' : '▼'}
                </span>
              </div>
            </CollapsibleTrigger>

            {/* Session Content */}
            <CollapsibleContent className="p-3 sm:p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
              {session.triviaItems
                .sort((a, b) => {
                  const priorityOrder: { [key: string]: number } = {
                    'COMMON_MISTAKE': 1,
                    'ENCOURAGEMENT': 2,
                    'INSIGHT': 3,
                    'STUDY_TIP': 4,
                    'CHALLENGE': 5,
                    'BIBLICAL_CONNECTION': 6
                  };
                  return (priorityOrder[a.type] || 99) - (priorityOrder[b.type] || 99);
                })
                .map((item, itemIndex) => {
                  const itemKey = `${sessionIndex}-${itemIndex}`;
                  const cardStyle = getCardStyle(item.type);
                  const icon = getTypeIcon(item.type);
                  
                  return (
                    <Collapsible
                      key={item.id}
                      open={expandedItems[itemKey]}
                      onOpenChange={(open) => setExpandedItems(prev => ({ ...prev, [itemKey]: open }))}
                      className={`rounded-lg ${cardStyle} overflow-hidden transition-all duration-200 hover:shadow-md`}
                    >
                      <CollapsibleTrigger className="w-full p-3 sm:p-4 text-left flex items-start justify-between gap-3 hover:opacity-80 transition-opacity">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-lg sm:text-xl shrink-0">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm leading-snug">
                              {item.title}
                            </h4>
                            {!expandedItems[itemKey] && item.content && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {item.content.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <span 
                          className="text-gray-500 dark:text-gray-400 shrink-0 transition-transform duration-200" 
                          style={{
                            transform: expandedItems[itemKey] ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        >
                          ▼
                        </span>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                        <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
                          {renderContent(item.content)}
                        </div>
                        {item.suggestedReading && (
                          <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              📖 Suggested Reading:
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.suggestedReading}
                            </p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-center text-gray-700 dark:text-gray-300">
          💪 <strong>Keep Growing:</strong> Review your learning journey regularly to master the scriptures!
        </p>
      </div>
    </div>
  );
}