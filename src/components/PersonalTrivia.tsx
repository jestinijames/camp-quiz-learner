'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Lightbulb, 
  AlertCircle, 
  Trophy,
  Calendar,
  Award
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';


type TriviaItem = {
  id: number;
  type: 'ENCOURAGEMENT' | 'INSIGHT' | 'CHALLENGE' | 'STUDY_TIP' | 'COMMON_MISTAKE' | 'BIBLICAL_CONNECTION';
  title: string;
  content: string;
  insight?: string;
  studyTips?: string;
  suggestedReading?: string;
  createdAt: string;
};

type SessionTrivia = {
  sessionId: number;
  quizTitle: string;
  quizId: number;
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
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set([0])); // First session open by default
  const [expandedItems, setExpandedItems] = useState<Map<number, Set<number>>>(new Map());

  useEffect(() => {
    const fetchPersonalTrivia = async () => {
      if (!user || user.isAdmin) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/member/personal-trivia');
        if (response.ok) {
          const sessions = await response.json();
          setTriviaSessions(sessions);
          
          // Auto-expand first 2 items of first session
          if (sessions.length > 0 && sessions[0].triviaItems.length > 0) {
            const firstSessionItems = new Set([0, 1].filter(i => i < sessions[0].triviaItems.length));
            setExpandedItems(new Map([[0, firstSessionItems]]));
          }
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

  const toggleSession = (sessionIndex: number) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionIndex)) {
        next.delete(sessionIndex);
      } else {
        next.add(sessionIndex);
      }
      return next;
    });
  };

  const toggleItem = (sessionIndex: number, itemIndex: number) => {
    setExpandedItems(prev => {
      const next = new Map(prev);
      const sessionItems = next.get(sessionIndex) || new Set();
      
      if (sessionItems.has(itemIndex)) {
        sessionItems.delete(itemIndex);
      } else {
        sessionItems.add(itemIndex);
      }
      
      next.set(sessionIndex, sessionItems);
      return next;
    });
  };

  if (!user || user.isAdmin || triviaSessions.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading your Bible learning journey...</p>
        </CardContent>
      </Card>
    );
  }

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'ENCOURAGEMENT':
        return {
          border: 'border-l-green-500',
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
          icon: Trophy,
          iconColor: 'text-green-600 dark:text-green-400'
        };
      case 'COMMON_MISTAKE':
        return {
          border: 'border-l-red-500',
          bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20',
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400'
        };
      case 'INSIGHT':
        return {
          border: 'border-l-blue-500',
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
          icon: Lightbulb,
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      case 'STUDY_TIP':
        return {
          border: 'border-l-purple-500',
          bg: 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20',
          icon: BookOpen,
          iconColor: 'text-purple-600 dark:text-purple-400'
        };
      default:
        return {
          border: 'border-l-gray-500',
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          icon: BookOpen,
          iconColor: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ENCOURAGEMENT': return '✅ Well Done';
      case 'COMMON_MISTAKE': return '❌ Learning Moment';
      case 'INSIGHT': return '💡 Key Insight';
      case 'STUDY_TIP': return '📚 Study Guide';
      default: return type;
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
      
      if (trimmedLine.startsWith('### ')) {
        return (
          <h4 key={index} className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            {trimmedLine.substring(4)}
          </h4>
        );
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
    <Card className="shadow-lg">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          Your Bible Learning Journey
        </CardTitle>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
          {triviaSessions.length} quiz session{triviaSessions.length !== 1 ? 's' : ''} completed
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {triviaSessions.map((session, sessionIndex) => {
            const isSessionExpanded = expandedSessions.has(sessionIndex);
            
            return (
              <Collapsible
                key={session.sessionId}
                open={isSessionExpanded}
                onOpenChange={() => toggleSession(sessionIndex)}
              >
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                  {/* Session Header */}
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                            {session.quizTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              📖 {session.bookName}
                            </Badge>
                            {session.totalScore !== null && (
                              <Badge variant="secondary" className="text-xs">
                                🎯 Score: {session.totalScore}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(session.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {session.triviaItems.length} insights
                        </Badge>
                      </div>
                      {isSessionExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {/* Session Content */}
                  <CollapsibleContent>
                    <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                      {session.triviaItems
                        .sort((a, b) => {
                          const priorityOrder: { [key: string]: number } = {
                            'COMMON_MISTAKE': 1,
                            'ENCOURAGEMENT': 2,
                            'INSIGHT': 3,
                            'STUDY_TIP': 4
                          };
                          return (priorityOrder[a.type] || 99) - (priorityOrder[b.type] || 99);
                        })
                        .map((item, itemIndex) => {
                          const isItemExpanded = expandedItems.get(sessionIndex)?.has(itemIndex) || false;
                          const style = getCardStyle(item.type);
                          const IconComponent = style.icon;
                          
                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg border-l-4 ${style.border} ${style.bg} overflow-hidden transition-all duration-200 hover:shadow-md`}
                            >
                              <button
                                onClick={() => toggleItem(sessionIndex, itemIndex)}
                                className="w-full p-3 sm:p-4 text-left flex items-start justify-between gap-3 hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 ${style.iconColor}`} />
                                  <div className="flex-1 min-w-0">
                                    <Badge variant="secondary" className="mb-1 text-xs">
                                      {getTypeLabel(item.type)}
                                    </Badge>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm leading-snug">
                                      {item.title}
                                    </h4>
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  {isItemExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                              </button>

                              {isItemExpanded && (
                                <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 animate-in fade-in duration-200">
                                  <div className="prose prose-sm max-w-none mb-3">
                                    {renderContent(item.content)}
                                  </div>

                                  {(item.insight || item.studyTips) && (
                                    <div className="space-y-2 mt-3">
                                      {item.insight && (
                                        <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-md border-l-2 border-l-purple-400 text-xs">
                                          <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">💝 Personal Note</p>
                                          <p className="text-purple-600 dark:text-purple-400">{item.insight}</p>
                                        </div>
                                      )}
                                      {item.studyTips && (
                                        <div className="bg-blue-100/80 dark:bg-blue-900/30 p-2 rounded-md border-l-2 border-l-blue-400 text-xs">
                                          <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">📖 Study Action</p>
                                          <p className="text-blue-600 dark:text-blue-400">{item.studyTips}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm text-center text-gray-700 dark:text-gray-300">
            💪 <strong>Keep Growing:</strong> Review your learning journey regularly to master the scriptures!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}