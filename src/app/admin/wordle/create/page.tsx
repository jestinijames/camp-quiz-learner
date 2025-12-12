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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BibleBook = {
  id: number;
  name: string;
};

export default function CreateWordlePage() {
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
    hint: ''
  });

  const [wordPool, setWordPool] = useState<string[]>([]);
  const [passageValidation, setPassageValidation] = useState<{
    valid: boolean;
    wordCount: number;
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
      const response = await fetch('/api/admin/wordle/regenerate-word', {
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
        setWordPool(data.wordPool);
        setPassageValidation({
          valid: true,
          wordCount: data.availableWords
        });
      } else {
        setPassageValidation({
          valid: false,
          wordCount: data.wordCount || 0,
          message: data.error
        });
        setWordPool([]);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setPassageValidation({
        valid: false,
        wordCount: 0,
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
      const response = await fetch('/api/admin/wordle/regenerate-word', {
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
        setWordPool(data.wordPool);
        setSuccess(`Generated ${data.totalWords} new words!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to regenerate word pool');
      }
    } catch (error) {
      setError('Failed to regenerate word pool');
      console.error('Regenerate error:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passageValidation?.valid) {
      setError('Please select a valid passage with enough 5-letter words');
      return;
    }

    if (!formData.title) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/wordle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/dashboard?success=wordle-created');
      } else {
        setError(data.error || 'Failed to create Wordle');
      }
    } catch (error) {
      setError('Failed to create Wordle');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Daily Wordle</CardTitle>
          </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Title */}
            <div>
              <Label htmlFor="title">Wordle Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Daily Wordle - 1 Corinthians"
                required
              />
            </div>

            {/* Bible Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="book">Book *</Label>
                <Select
                  value={formData.bookId}
                  onValueChange={(value) => setFormData({ ...formData, bookId: value })}
                >
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="fromChapter">From Chapter *</Label>
                <Input
                  id="fromChapter"
                  type="number"
                  min="1"
                  value={formData.fromChapter}
                  onChange={(e) => setFormData({ ...formData, fromChapter: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fromVerse">From Verse *</Label>
                <Input
                  id="fromVerse"
                  type="number"
                  min="1"
                  value={formData.fromVerse}
                  onChange={(e) => setFormData({ ...formData, fromVerse: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="toChapter">To Chapter *</Label>
                <Input
                  id="toChapter"
                  type="number"
                  min="1"
                  value={formData.toChapter}
                  onChange={(e) => setFormData({ ...formData, toChapter: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="toVerse">To Verse *</Label>
                <Input
                  id="toVerse"
                  type="number"
                  min="1"
                  value={formData.toVerse}
                  onChange={(e) => setFormData({ ...formData, toVerse: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Passage Validation Status */}
            {validating && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Validating passage...</span>
              </div>
            )}

            {passageValidation && (
              <div className={`flex items-center gap-2 p-3 rounded ${
                passageValidation.valid 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {passageValidation.valid ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        Passage validated! Found {passageValidation.wordCount} unique 5-letter words.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        {passageValidation.message}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Try selecting a longer passage or different verses.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Word Pool Preview */}
            {wordPool.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Generated Word Pool ({wordPool.length} words)
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Pool
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordPool.map((word, index) => (
                    <Badge key={index} variant="secondary" className="text-sm font-mono">
                      {word}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  💡 Members will be randomly assigned one of these words when they play
                </p>
              </div>
            )}

            {/* Optional Hint */}
            <div>
              <Label htmlFor="hint">Custom Hint (Optional)</Label>
              <Textarea
                id="hint"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                placeholder="e.g., This word appears multiple times in Paul's letter..."
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use default hint (passage reference)
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={loading || !passageValidation?.valid}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Wordle...
                </>
              ) : (
                'Create Daily Wordle'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}