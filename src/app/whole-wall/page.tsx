'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Card {
  id: string;
  content: string;
  color: string;
  positionX: number;
  positionY: number;
  authorId: number;
  Member?: {
    id: number;
    firstName: string;
    lastName: string;
    Team?: {
      id: number;
      name: string;
      logo: string | null;
    } | null;
  };
  CollaborationWallSession?: {
    id: number;
    title: string;
  };
}

interface WallSession {
  id: number;
  title: string;
}

export default function WholeWallPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<WallSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const fetchSessions = useCallback(async () => {
    try {
      // Fetch all collaboration cards to extract unique sessions
      const response = await fetch('/api/all-collaboration-cards');
      if (response.ok) {
        const allCards = await response.json();
        const uniqueSessions: WallSession[] = [];
        const seenIds = new Set<number>();
        
        allCards.forEach((card: Card) => {
          if (card.CollaborationWallSession && !seenIds.has(card.CollaborationWallSession.id)) {
            seenIds.add(card.CollaborationWallSession.id);
            uniqueSessions.push({
              id: card.CollaborationWallSession.id,
              title: card.CollaborationWallSession.title
            });
          }
        });
        
        // Sort by ID descending (newest first)
        uniqueSessions.sort((a, b) => b.id - a.id);
        setSessions(uniqueSessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = selectedSession === 'all' 
        ? '/api/all-collaboration-cards' 
        : `/api/all-collaboration-cards?sessionId=${selectedSession}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetchCards();
    }
  }, [user, selectedSession, fetchCards]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (user.isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">This page is for users only.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Top toolbar */}
      <div className="shrink-0 p-2 bg-white border-b flex items-center justify-between gap-3 flex-wrap shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-900">Collaboration Wall</h1>
        
        {/* Session Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Filter:</label>
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-[10px] text-gray-500 ml-auto">
          {cards.length} cards
        </p>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-gray-500">Loading collaboration cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">No collaboration cards yet</p>
              <p className="text-sm">Cards will appear here as teams create them</p>
            </div>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7 gap-1">
            {cards.map((card) => (
              <div
                key={card.id}
                className="rounded-md shadow-sm p-1 transition-transform hover:scale-105 hover:shadow-md w-full mb-1 break-inside-avoid"
                style={{ backgroundColor: card.color }}
              >
                {/* Card Content */}
                <div className="text-xs text-gray-800 leading-tight whitespace-pre-wrap break-words">
                  {card.content}
                </div>

                {/* Author Info */}
                <div className="border-t border-gray-300 mt-1 pt-0.5 flex items-center gap-1">
                  {card.Member?.Team?.logo && (
                    <img 
                      src={card.Member.Team.logo} 
                      alt={card.Member.Team.name || 'Team'} 
                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                    />
                  )}
                  <div className="text-[9px] leading-none min-w-0 flex-1">
                    <div className="font-semibold text-gray-800 truncate leading-none mb-0.5">
                      {card.Member ? `${card.Member.firstName} ${card.Member.lastName}` : 'Unknown'}
                    </div>
                    {card.Member?.Team?.name && (
                      <div className="text-gray-600 truncate leading-none">{card.Member.Team.name}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
