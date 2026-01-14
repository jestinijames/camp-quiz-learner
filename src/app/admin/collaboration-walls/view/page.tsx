'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CollaborationWallSession {
  id: number;
  title: string;
  description: string | null;
  isActive: boolean;
  _count: {
    CollaborationCard: number;
  };
}

interface CollaborationCard {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
    team: {
      id: number;
      name: string;
    } | null;
  };
}

interface TeamCardStats {
  teamId: number;
  teamName: string;
  cardCount: number;
  members: string[];
}

export default function ViewCollaborationWalls() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CollaborationWallSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<TeamCardStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/collaboration-walls');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCardsForSession = async (sessionId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/collaboration-walls/${sessionId}/view-all`);
      if (response.ok) {
        const cards: CollaborationCard[] = await response.json();
        
        // Group cards by team
        const teamMap = new Map<number, TeamCardStats>();
        
        cards.forEach(card => {
          const teamId = card.author.team?.id || 0;
          const teamName = card.author.team?.name || 'No Team';
          const authorName = `${card.author.firstName} ${card.author.lastName}`;
          
          if (!teamMap.has(teamId)) {
            teamMap.set(teamId, {
              teamId,
              teamName,
              cardCount: 0,
              members: []
            });
          }
          
          const teamStat = teamMap.get(teamId)!;
          teamStat.cardCount++;
          if (!teamStat.members.includes(authorName)) {
            teamStat.members.push(authorName);
          }
        });
        
        setTeamStats(Array.from(teamMap.values()).sort((a, b) => b.cardCount - a.cardCount));
        setSelectedSession(sessionId);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">View Collaboration Wall Cards</h1>
      </div>

      {!selectedSession ? (
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Select a Wall Session</h2>
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => fetchCardsForSession(session.id)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{session.title}</span>
                  <span className={`text-sm ${session.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{session.description}</p>
                <p className="mt-2 font-semibold">Total Cards: {session._count?.CollaborationCard || 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSession(null);
                setTeamStats([]);
              }}
            >
              ← Back to Sessions
            </Button>
          </div>

          <h2 className="text-2xl font-bold mb-4">
            {sessions.find(s => s.id === selectedSession)?.title}
          </h2>

          <div className="grid gap-4">
            {teamStats.map((stat) => (
              <Card key={stat.teamId}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{stat.teamName}</span>
                    <span className="text-blue-600">{stat.cardCount} cards</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-2">
                    <strong>{stat.members.length}</strong> unique member{stat.members.length !== 1 ? 's' : ''} contributed:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stat.members.map((member, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {teamStats.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No cards found for this session.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
