'use client';

import { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';

interface BibleBook {
  id: number;
  name: string;
}

interface BibleChapter {
  id: number;
  number: number;
  verses: { id: number; number: number }[];
}

export default function CreateWordlePage() {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [title, setTitle] = useState('');
  const [fromChapter, setFromChapter] = useState('');
  const [fromVerse, setFromVerse] = useState('');
  const [toChapter, setToChapter] = useState('');
  const [toVerse, setToVerse] = useState('');
  const [generatedWord, setGeneratedWord] = useState('');
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const router = useRouter();

 
  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/admin/bible/books');
      const data = await response.json();
      startTransition(() => {
        setBooks(data);
      });
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const fetchChapters = async (bookId: string) => {
    try {
      const response = await fetch(`/api/admin/bible/chapters?bookId=${bookId}`);
      const data = await response.json();
      setChapters(data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setChapters([]);
    setFromChapter('');
    setFromVerse('');
    setToChapter('');
    setToVerse('');
    setGeneratedWord('');
    
    if (bookId) {
      fetchChapters(bookId);
      const book = books.find(b => b.id.toString() === bookId);
      if (book) {
        setTitle(`Daily Wordle - ${book.name}`);
      }
    }
  };

  const generatePreviewWord = async () => {
    if (!selectedBook || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await fetch('/api/admin/wordle/regenerate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook,
          fromChapter,
          fromVerse,
          toChapter,
          toVerse
        })
      });

      const data = await response.json();
      if (response.ok) {
        setGeneratedWord(data.word);
      } else {
        alert('Error generating word: ' + data.error);
      }
    } catch (error) {
      alert('Error generating word: ' + error);
    }
    setRegenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !selectedBook || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/wordle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bookId: selectedBook,
          fromChapter,
          fromVerse,
          toChapter,
          toVerse
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Wordle created successfully! Word: ${data.wordle.word}`);
        router.push('/admin/dashboard');
      } else {
        alert('Error creating Wordle: ' + data.error);
      }
    } catch (error) {
      alert('Error creating Wordle: ' + error);
    }
    setCreating(false);
  };

   useEffect(() => {
    fetchBooks();
  }, []);


  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Daily Bible Wordle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Daily Wordle - Genesis"
                required
              />
            </div>

            {/* Book Selection */}
            <div>
              <Label htmlFor="book">Bible Book</Label>
              <Select value={selectedBook} onValueChange={handleBookSelect} required>
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

            {/* Range Selection */}
            {selectedBook && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="fromChapter">From Chapter</Label>
                  <Input
                    id="fromChapter"
                    type="number"
                    min="1"
                    value={fromChapter}
                    onChange={(e) => setFromChapter(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fromVerse">From Verse</Label>
                  <Input
                    id="fromVerse"
                    type="number"
                    min="1"
                    value={fromVerse}
                    onChange={(e) => setFromVerse(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="toChapter">To Chapter</Label>
                  <Input
                    id="toChapter"
                    type="number"
                    min={fromChapter || "1"}
                    value={toChapter}
                    onChange={(e) => setToChapter(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="toVerse">To Verse</Label>
                  <Input
                    id="toVerse"
                    type="number"
                    min="1"
                    value={toVerse}
                    onChange={(e) => setToVerse(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Preview Word */}
            {selectedBook && fromChapter && fromVerse && toChapter && toVerse && (
              <div className="space-y-4">
                <Button 
                  type="button"
                  onClick={generatePreviewWord}
                  disabled={regenerating}
                  variant="outline"
                  className="w-full"
                >
                  {regenerating ? 'Generating...' : generatedWord ? 'Regenerate Word' : 'Preview Word'}
                </Button>

                {generatedWord && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <h3 className="font-semibold text-green-800 mb-2">Generated Word:</h3>
                    <div className="text-2xl font-bold text-green-900 tracking-wider">
                      {generatedWord}
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      This word was found in the selected scripture passage
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={creating || !generatedWord}
              className="w-full"
            >
              {creating ? 'Creating...' : 'Create Daily Wordle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}