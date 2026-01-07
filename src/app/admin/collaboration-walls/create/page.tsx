'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Plus, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BibleBook = {
  id: number;
  name: string;
};

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
  createdAt: string;
};

export default function CreateCollaborationWallPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [wallSessions, setWallSessions] = useState<WallSession[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [fromChapter, setFromChapter] = useState('');
  const [fromVerse, setFromVerse] = useState('');
  const [toChapter, setToChapter] = useState('');
  const [toVerse, setToVerse] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [booksRes, wallsRes] = await Promise.all([
          fetch('/api/admin/bible/books'),
          fetch('/api/admin/collaboration-walls')
        ]);
        
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          setBooks(booksData);
        }
        
        if (wallsRes.ok) {
          const wallsData = await wallsRes.json();
          setWallSessions(wallsData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [user, router]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!title || !selectedBookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/collaboration-walls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          bookId: parseInt(selectedBookId),
          fromChapter: parseInt(fromChapter),
          fromVerse: parseInt(fromVerse),
          toChapter: parseInt(toChapter),
          toVerse: parseInt(toVerse),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`✅ Collaboration Wall "${result.title}" created successfully!`);
        
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedBookId('');
        setFromChapter('');
        setFromVerse('');
        setToChapter('');
        setToVerse('');
        
        // Refresh wall sessions list
        const wallsRes = await fetch('/api/admin/collaboration-walls');
        if (wallsRes.ok) {
          const wallsData = await wallsRes.json();
          setWallSessions(wallsData);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create collaboration wall');
      }
    } catch {
      setError('Failed to create collaboration wall');
    } finally {
      setLoading(false);
    }
  };

  const toggleWallStatus = async (wallId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/collaboration-walls/${wallId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(currentStatus ? 'Wall deactivated successfully' : 'Wall activated successfully');
        // Refresh list
        const wallsRes = await fetch('/api/admin/collaboration-walls');
        if (wallsRes.ok) {
          const wallsData = await wallsRes.json();
          setWallSessions(wallsData);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to toggle wall status');
      }
    } catch (error) {
      console.error('Failed to toggle wall status:', error);
      toast.error('Failed to toggle wall status');
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Create Collaboration Wall
        </h1>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>New Collaboration Wall Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Wall Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 1 Corinthians 13 - Love Chapter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="book">Bible Book *</Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id.toString()}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this collaboration wall topic..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromChapter">From Chapter *</Label>
              <Input
                id="fromChapter"
                type="number"
                min="1"
                value={fromChapter}
                onChange={(e) => setFromChapter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromVerse">From Verse *</Label>
              <Input
                id="fromVerse"
                type="number"
                min="1"
                value={fromVerse}
                onChange={(e) => setFromVerse(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toChapter">To Chapter *</Label>
              <Input
                id="toChapter"
                type="number"
                min="1"
                value={toChapter}
                onChange={(e) => setToChapter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toVerse">To Verse *</Label>
              <Input
                id="toVerse"
                type="number"
                min="1"
                value={toVerse}
                onChange={(e) => setToVerse(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Collaboration Wall'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Existing Walls */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Collaboration Walls</CardTitle>
        </CardHeader>
        <CardContent>
          {wallSessions.length > 0 ? (
            <div className="space-y-3">
              {wallSessions.map((wall) => (
                <div
                  key={wall.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{wall.title}</h3>
                      {wall.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {wall.book.name} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                    </p>
                    {wall.description && (
                      <p className="text-sm text-gray-500 mt-1">{wall.description}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      {wall._count.cards} {wall._count.cards === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWallStatus(wall.id, wall.isActive)}
                  >
                    {wall.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No collaboration walls created yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
