/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/emoji/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

type BibleBook = { id: number; name: string };
type EmojiPuzzle = { emojis: string; verse: string; hint?: string };

export default function CreateEmojiGamePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedPuzzles, setGeneratedPuzzles] = useState<EmojiPuzzle[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    bookId: '',
    fromChapter: '',
    fromVerse: '',
    toChapter: '',
    toVerse: '',
    hint: ''
  });

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/admin/bible/books');
        if (response.ok) {
          const data = await response.json();
          setBooks(data);
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
      }
    };

    fetchBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedPuzzles([]);

    try {
      const response = await fetch('/api/admin/emoji/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bookId: parseInt(formData.bookId),
          fromChapter: parseInt(formData.fromChapter),
          fromVerse: parseInt(formData.fromVerse),
          toChapter: parseInt(formData.toChapter),
          toVerse: parseInt(formData.toVerse)
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`✅ Emoji game "${result.game.title}" created with ${result.game.puzzleCount} puzzles!`);
        setGeneratedPuzzles(result.puzzles);
        
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 3000);
      } else {
        setError(result.error || 'Failed to create emoji game');
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📱</span>
            Create Emoji Verse Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Game Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 1 Corinthians 2 Emoji Challenge"
                required
              />
            </div>

            {/* Bible Book */}
            <div>
              <Label htmlFor="book">Bible Book</Label>
              <Select
                value={formData.bookId}
                onValueChange={(value) => setFormData({ ...formData, bookId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a book" />
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

            {/* Passage Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Chapter:Verse</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Ch"
                    value={formData.fromChapter}
                    onChange={(e) => setFormData({ ...formData, fromChapter: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    placeholder="V"
                    value={formData.fromVerse}
                    onChange={(e) => setFormData({ ...formData, fromVerse: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>To Chapter:Verse</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Ch"
                    value={formData.toChapter}
                    onChange={(e) => setFormData({ ...formData, toChapter: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    placeholder="V"
                    value={formData.toVerse}
                    onChange={(e) => setFormData({ ...formData, toVerse: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hint */}
            <div>
              <Label htmlFor="hint">Overall Hint (Optional)</Label>
              <Textarea
                id="hint"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                placeholder="e.g., Focus on wisdom and spiritual understanding"
                rows={2}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating Emoji Puzzles...
                </span>
              ) : (
                '🎨 Generate Emoji Game'
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Preview Generated Puzzles */}
          {generatedPuzzles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-lg">Generated Puzzles Preview:</h3>
              {generatedPuzzles.map((puzzle, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl mb-2">{puzzle.emojis}</div>
                      <div className="text-sm text-gray-600">
                        <strong>Answer:</strong> {puzzle.verse}
                      </div>
                      {puzzle.hint && (
                        <div className="text-xs text-gray-500 mt-1">
                          💡 {puzzle.hint}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}