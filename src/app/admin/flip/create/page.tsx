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
import { Loader2, Sparkles, BookOpen, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type BibleBook = {
  id: number;
  name: string;
  BibleVersion: { name: string };
  BibleChapter: { id: number; number: number; BibleVerse: { id: number; number: number }[] }[];
};

type VersePair = {
  reference: string;
  start: string;
  end: string;
  fullVerse: string;
};

export default function CreateFlipGamePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [versePairs, setVersePairs] = useState<VersePair[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [poolInfo, setPoolInfo] = useState<{ totalVerses: number; availableVerses: number } | null>(null);
  
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

  // Auto-validate when scripture range is complete
  useEffect(() => {
    const { bookId, fromChapter, fromVerse, toChapter, toVerse } = formData;
    if (bookId && fromChapter && fromVerse && toChapter && toVerse) {
      generateVersePairs();
    } else {
      setVersePairs([]);
      setValidationMessage('');
      setPoolInfo(null);
    }
  }, [formData.bookId, formData.fromChapter, formData.fromVerse, formData.toChapter, formData.toVerse]);

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

  const generateVersePairs = async (regenerate = false) => {
    setValidating(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        bookId: formData.bookId,
        fromChapter: formData.fromChapter,
        fromVerse: formData.fromVerse,
        toChapter: formData.toChapter,
        toVerse: formData.toVerse,
        poolSize: '20', // Generate 20 verse pairs for variety
      });

      const response = await fetch(`/api/admin/flip/generate-verses?${params}`);
      const data = await response.json();

      if (response.ok) {
        setVersePairs(data.versePairs);
        setValidationMessage(data.message);
        setPoolInfo({
          totalVerses: data.totalVerses,
          availableVerses: data.availableVerses,
        });
      } else {
        setError(data.error || 'Failed to generate verse pairs');
        setVersePairs([]);
        setValidationMessage('');
        setPoolInfo(null);
      }
    } catch (error) {
      setError('Failed to generate verse pairs');
      setVersePairs([]);
    } finally {
      setValidating(false);
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
    
    if (!versePairs || versePairs.length < 8) {
      setError('Please wait for verse pairs to generate, or select a valid scripture range with at least 8 verses.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/flip/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          versePairs, // Send the generated verse pairs
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
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

            {/* Verse Pairs Preview */}
            {versePairs.length > 0 && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Generated Verse Pairs Preview</span>
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateVersePairs(true)}
                      disabled={validating}
                    >
                      {validating ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                  {poolInfo && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <p>{validationMessage}</p>
                      <p className="mt-1 font-medium text-blue-600 dark:text-blue-400">
                        ℹ️ Each user will be randomly assigned 8 pairs from this pool of {versePairs.length} for variety
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {versePairs.map((pair, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
                      >
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                          Pair {index + 1}: {pair.reference}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                            <span className="text-gray-600 dark:text-gray-400">Start:</span>
                            <p className="font-medium mt-1">{pair.start}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-purple-200 dark:border-purple-700">
                            <span className="text-gray-600 dark:text-gray-400">End:</span>
                            <p className="font-medium mt-1">{pair.end}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Validation in progress */}
            {validating && versePairs.length === 0 && (
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="py-6">
                  <div className="flex items-center space-x-3 text-yellow-700 dark:text-yellow-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Validating scripture range and generating verse pairs...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Game Details:
              </h4>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Grid Size: 4x4 (16 cards, 8 pairs)</li>
                <li>• No Time Limit (Bonus Game)</li>
                <li>• Points: Up to 4 (0.5 per pair)</li>
                <li>• Cards: Verse start + Verse end matching</li>
                <li>• Pool Size: 20 verse pairs generated for variety</li>
                <li>• Each user randomly gets 8 pairs from the pool</li>
                <li>• Prioritizes shorter verses (≤15 words) for mobile readability</li>
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
            <Button 
              type="submit" 
              disabled={loading || validating || versePairs.length === 0} 
              className="w-full" 
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : versePairs.length === 0 ? (
                'Select Scripture Range to Continue'
              ) : (
                `Create Flip Game with ${versePairs.length} Verse Pairs`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
