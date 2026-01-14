'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type BibleBook = {
  id: number;
  name: string;
  BibleVersion: { name: string };
  BibleChapter: { id: number; number: number; BibleVerse: { id: number; number: number }[] }[];
};

export default function CreateFlipGamePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    bookId: '',
    fromChapter: '',
    fromVerse: '',
    toChapter: '',
    toVerse: '',
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/admin/bible/books?includeVerses=true');
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  };

  const getSelectedBook = () => {
    return books.find(book => book.id.toString() === formData.bookId);
  };

  const getChaptersForBook = () => {
    return getSelectedBook()?.BibleChapter || [];
  };

  const getVersesForChapter = (chapterNumber: string) => {
    const book = getSelectedBook();
    if (!book || !chapterNumber) return [];
    
    const chapter = book.BibleChapter.find(ch => ch.number.toString() === chapterNumber);
    return chapter?.BibleVerse || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/flip/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Flip game "${formData.title}" created successfully with ${data.versePairs.length} verse pairs!`);
        setTimeout(() => router.push('/admin'), 2000);
      } else {
        setError(data.error || 'Failed to create flip game');
      }
    } catch (error) {
      setError('Failed to create flip game');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6" />
            <span>Create Flip Card Memory Game</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Game Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., John 3:16-21 Memory Match"
                required
              />
            </div>

            {/* Scripture Selection */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Scripture Range Selection *</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select at least 8 verses for the memory game
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bible Book */}
                <div className="space-y-2">
                  <Label>Bible Book *</Label>
                  <Select
                    value={formData.bookId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bookId: value, fromChapter: '', fromVerse: '', toChapter: '', toVerse: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Bible book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books.map((book) => (
                        <SelectItem key={book.id} value={book.id.toString()}>
                          {book.name} ({book.BibleVersion.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Verse Range */}
                {formData.bookId && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* From Chapter */}
                    <div className="space-y-2">
                      <Label>From Chapter *</Label>
                      <Select
                        value={formData.fromChapter}
                        onValueChange={(value) =>
                          setFormData({ ...formData, fromChapter: value, fromVerse: '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {getChaptersForBook().map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.number.toString()}>
                              {chapter.number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* From Verse */}
                    <div className="space-y-2">
                      <Label>From Verse *</Label>
                      <Select
                        value={formData.fromVerse}
                        onValueChange={(value) => setFormData({ ...formData, fromVerse: value })}
                        disabled={!formData.fromChapter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Verse" />
                        </SelectTrigger>
                        <SelectContent>
                          {getVersesForChapter(formData.fromChapter).map((verse) => (
                            <SelectItem key={verse.id} value={verse.number.toString()}>
                              {verse.number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* To Chapter */}
                    <div className="space-y-2">
                      <Label>To Chapter *</Label>
                      <Select
                        value={formData.toChapter}
                        onValueChange={(value) =>
                          setFormData({ ...formData, toChapter: value, toVerse: '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {getChaptersForBook().map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.number.toString()}>
                              {chapter.number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* To Verse */}
                    <div className="space-y-2">
                      <Label>To Verse *</Label>
                      <Select
                        value={formData.toVerse}
                        onValueChange={(value) => setFormData({ ...formData, toVerse: value })}
                        disabled={!formData.toChapter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Verse" />
                        </SelectTrigger>
                        <SelectContent>
                          {getVersesForChapter(formData.toChapter).map((verse) => (
                            <SelectItem key={verse.id} value={verse.number.toString()}>
                              {verse.number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Game Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Game Details:
              </h4>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Grid Size: 4x4 (16 cards, 8 pairs)</li>
                <li>• Time Limit: 4 minutes</li>
                <li>• Points: 10 (on completion)</li>
                <li>• Cards: Verse start + Verse end matching</li>
                <li>• System selects 8 shortest verses for mobile readability</li>
              </ul>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                'Create Flip Game'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
