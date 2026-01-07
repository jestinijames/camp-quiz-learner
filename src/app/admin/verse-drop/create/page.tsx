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
import { Loader2, RefreshCw, CheckCircle, XCircle, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BibleBook = {
  id: number;
  name: string;
};

type VerseItem = {
  ref: string;
  text: string;
};

export default function CreateVerseDropPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [validating, setValidating] = useState(false);
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

  const [versePool, setVersePool] = useState<VerseItem[]>([]);
  const [passageValidation, setPassageValidation] = useState<{
    valid: boolean;
    verseCount: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

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

  // Auto-validate passage when reference changes
  useEffect(() => {
    if (formData.bookId && formData.fromChapter && formData.fromVerse && 
        formData.toChapter && formData.toVerse) {
      validatePassage();
    }
  }, [formData.bookId, formData.fromChapter, formData.fromVerse, formData.toChapter, formData.toVerse]);

  const validatePassage = async () => {
    setValidating(true);
    setPassageValidation(null);
    
    try {
      const response = await fetch('/api/admin/verse-drop/generate-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: formData.bookId,
          fromChapter: formData.fromChapter,
          fromVerse: formData.fromVerse,
          toChapter: formData.toChapter,
          toVerse: formData.toVerse,
          poolSize: 12
        })
      });

      const data = await response.json();

      if (response.ok) {
        setVersePool(data.versePool);
        setPassageValidation({
          valid: true,
          verseCount: data.totalVerses
        });
      } else {
        setPassageValidation({
          valid: false,
          verseCount: data.verseCount || 0,
          message: data.error
        });
        setVersePool([]);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setPassageValidation({
        valid: false,
        verseCount: 0,
        message: 'Failed to validate passage'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!formData.bookId || !formData.fromChapter || !formData.fromVerse || 
        !formData.toChapter || !formData.toVerse) {
      setError('Please fill in all passage reference fields first');
      return;
    }

    setRegenerating(true);
    setError('');

    try {
      const response = await fetch('/api/admin/verse-drop/generate-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: formData.bookId,
          fromChapter: formData.fromChapter,
          fromVerse: formData.fromVerse,
          toChapter: formData.toChapter,
          toVerse: formData.toVerse,
          poolSize: 12
        })
      });

      const data = await response.json();

      if (response.ok) {
        setVersePool(data.versePool);
        setSuccess(`Generated ${data.totalVerses} verses!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to generate verses');
      }
    } catch (error) {
      setError('Failed to regenerate verses');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passageValidation?.valid) {
      setError('Please validate the passage first');
      return;
    }

    if (versePool.length < 10) {
      setError('Need at least 10 verses. Please select a larger passage.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/verse-drop/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          versePool: versePool, // Pass as array, API will stringify
          timeLimit: 240 // 4 minutes
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verse Drop game created successfully!');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create Verse Drop game');
      }
    } catch (error) {
      setError('Failed to create Verse Drop game');
    } finally {
      setLoading(false);
    }
  };

  const selectedBook = books.find(b => b.id === parseInt(formData.bookId));

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Droplets className="h-6 w-6 text-blue-500" />
            <span>Create Verse Drop Game</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Game Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 1 Corinthians 1-2 Verse Drop"
                required
              />
            </div>

            {/* Bible Book Selection */}
            <div>
              <Label htmlFor="book">Bible Book *</Label>
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
                <Label>From Chapter:Verse *</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    min="1"
                    value={formData.fromChapter}
                    onChange={(e) => setFormData({ ...formData, fromChapter: e.target.value })}
                    placeholder="Ch"
                    required
                  />
                  <Input
                    type="number"
                    min="1"
                    value={formData.fromVerse}
                    onChange={(e) => setFormData({ ...formData, fromVerse: e.target.value })}
                    placeholder="Vs"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>To Chapter:Verse *</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    min="1"
                    value={formData.toChapter}
                    onChange={(e) => setFormData({ ...formData, toChapter: e.target.value })}
                    placeholder="Ch"
                    required
                  />
                  <Input
                    type="number"
                    min="1"
                    value={formData.toVerse}
                    onChange={(e) => setFormData({ ...formData, toVerse: e.target.value })}
                    placeholder="Vs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Passage Validation Status */}
            {validating && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validating passage...</span>
              </div>
            )}

            {passageValidation && (
              <div className={`flex items-center space-x-2 ${passageValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                {passageValidation.valid ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>✓ Found {passageValidation.verseCount} verses in this passage</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>{passageValidation.message || 'Invalid passage'}</span>
                  </>
                )}
              </div>
            )}

            {/* Verse Pool Preview */}
            {versePool.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Verse Pool ({versePool.length} verses)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
                <Card className="bg-gray-50">
                  <CardContent className="p-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {versePool.map((verse, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-sm">
                          <Badge variant="outline" className="mt-0.5 shrink-0">
                            {selectedBook?.name} {verse.ref}
                          </Badge>
                          <span className="text-gray-700">{verse.text.substring(0, 100)}{verse.text.length > 100 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <p className="text-sm text-gray-500">
                  💡 Each user will get one random verse from this pool to complete
                </p>
              </div>
            )}

            {/* Messages */}
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
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={loading || !passageValidation?.valid || versePool.length < 10}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Verse Drop Game'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
