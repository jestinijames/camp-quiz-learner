'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CollaborationModal } from './CollaborationModal';
import { ReadPortionModal } from './ReadPortionModal';
import { Button } from './ui/button';
import { MessageSquare, Book, BookOpen } from 'lucide-react';

type WallSession = {
  id: number;
  title: string;
  description: string | null;
  book: {
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
  isActive: boolean;
  _count: {
    cards: number;
  };
};

type User = {
  isAdmin: boolean;
};

interface CollaborationWallsSectionProps {
  user: User | null;
}

export function CollaborationWallsSection({ user }: CollaborationWallsSectionProps) {
  const [wallSessions, setWallSessions] = useState<WallSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [readPortionModalOpen, setReadPortionModalOpen] = useState(false);
  const [selectedWallId, setSelectedWallId] = useState<number | null>(null);
  const [listenedWalls, setListenedWalls] = useState<Set<number>>(new Set());

  const fetchWallSessions = useCallback(async () => {
    if (!user || user.isAdmin) return;

    setLoading(true);
    try {
      const response = await fetch('/api/collaboration-walls', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const walls = await response.json();
        setWallSessions(walls);
        
        // Check listen status for each wall
        const listenedSet = new Set<number>();
        await Promise.all(
          walls.map(async (wall: WallSession) => {
            try {
              const statusResponse = await fetch(`/api/collaboration-walls/${wall.id}/listen-status`);
              if (statusResponse.ok) {
                const status = await statusResponse.json();
                if (status.hasListened) {
                  listenedSet.add(wall.id);
                }
              }
            } catch (err) {
              console.error(`Error checking listen status for wall ${wall.id}:`, err);
            }
          })
        );
        setListenedWalls(listenedSet);
      }
    } catch (error) {
      console.error('Failed to fetch collaboration walls:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleListeningComplete = (wallId: number) => {
    setListenedWalls(prev => new Set(prev).add(wallId));
  };

  useEffect(() => {
    fetchWallSessions();
  }, [fetchWallSessions]);

  // Don't render for admin users
  if (!user || user.isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">💡 Scripture Collaboration Walls</CardTitle>
        <p className="text-xs sm:text-sm text-gray-600">
          Listen to passages aloud (+4 points) and share learnings with your team
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading scripture portions...</p>
          </div>
        ) : wallSessions.length > 0 ? (
          <div className="space-y-3">
            {wallSessions.map((wall) => (
              <div 
                key={wall.id} 
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md transition-shadow space-y-3 sm:space-y-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <Book className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base wrap-break-word leading-tight text-gray-900">
                          {wall.title}
                        </h3>
                        {wall.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full shrink-0">
                            Closed
                          </span>
                        )}
                      </div>
                      {wall.description && (
                        <p className="text-xs sm:text-sm text-gray-700 mb-1 wrap-break-word">
                          {wall.description}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-600 wrap-break-word">
                        {wall.book.name} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                      </p>
                      {wall._count.cards > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          <MessageSquare className="inline w-3 h-3 mr-1" />
                          {wall._count.cards} {wall._count.cards === 1 ? 'insight' : 'insights'} shared
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!listenedWalls.has(wall.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWallId(wall.id);
                        setReadPortionModalOpen(true);
                      }}
                      className="border-blue-200 hover:bg-blue-50"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      <span>Read Portion</span>
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setSelectedWallId(wall.id);
                      setCollabModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>Wall</span>
                    {wall._count.cards > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {wall._count.cards}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">No collaboration walls available yet.</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Check back later for scripture collaboration opportunities!
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Modals */}
      {selectedWallId && (
        <>
          <ReadPortionModal
            wallSessionId={selectedWallId}
            isOpen={readPortionModalOpen}
            onClose={() => {
              setReadPortionModalOpen(false);
              fetchWallSessions(); // Refresh to update listened status
            }}
            onListeningComplete={handleListeningComplete}
          />
          <CollaborationModal
            wallSessionId={selectedWallId}
            isOpen={collabModalOpen}
            onClose={() => {
              setCollabModalOpen(false);
              setSelectedWallId(null);
              fetchWallSessions(); // Refresh to update card counts
            }}
          />
        </>
      )}
    </Card>
  );
}

