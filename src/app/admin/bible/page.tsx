/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BibleVersion = {
  id: number;
  name: string;
};

type BibleBook = {
  id: number;
  name: string;
  versionId: number;
};

type BibleChapter = {
  id: number;
  number: number;
  bookId: number;
};

type BibleVerse = {
  id?: number;
  number: number;
  text: string;
  chapterId?: number;
};

export default function BibleAdminPage() {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  
  const [newVersion, setNewVersion] = useState('');
  const [newBook, setNewBook] = useState('');
  const [newChapterNumber, setNewChapterNumber] = useState('');
  
  const [verses, setVerses] = useState<BibleVerse[]>([
    { number: 1, text: '' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, []);

  // Fetch books when version changes
  useEffect(() => {
    if (selectedVersion) {
      fetchBooks(parseInt(selectedVersion));
      setSelectedBook('');
      setSelectedChapter('');
    }
  }, [selectedVersion]);

  // Fetch chapters when book changes
  useEffect(() => {
    if (selectedBook) {
      fetchChapters(parseInt(selectedBook));
      setSelectedChapter('');
    }
  }, [selectedBook]);

  // Fetch verses when chapter changes
  useEffect(() => {
    if (selectedChapter) {
      fetchVerses(parseInt(selectedChapter));
    }
  }, [selectedChapter]);

  async function fetchVersions() {
    try {
      const response = await axios.get('/api/admin/bible/versions');
      setVersions(response.data);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  }

  async function fetchBooks(versionId: number) {
    try {
      const response = await axios.get(`/api/admin/bible/books?versionId=${versionId}`);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  }

  async function fetchChapters(bookId: number) {
    try {
      const response = await axios.get(`/api/admin/bible/chapters?bookId=${bookId}`);
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  }

  async function fetchVerses(chapterId: number) {
    try {
      const response = await axios.get(`/api/admin/bible/verses?chapterId=${chapterId}`);
      if (response.data.length > 0) {
        setVerses(response.data);
      }
    } catch (error) {
      console.error('Error fetching verses:', error);
    }
  }

  async function createVersion() {
    if (!newVersion.trim()) return;
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/bible/versions', { name: newVersion.trim() });
      setVersions([...versions, response.data]);
      setNewVersion('');
    } catch (error) {
      setError('Failed to create version');
    } finally {
      setLoading(false);
    }
  }

  async function createBook() {
    if (!newBook.trim() || !selectedVersion) return;
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/bible/books', { 
        name: newBook.trim(), 
        versionId: parseInt(selectedVersion) 
      });
      setBooks([...books, response.data]);
      setNewBook('');
    } catch (error: any) {
      setError(`Failed to create book: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createChapter() {
    if (!newChapterNumber || !selectedBook) return;
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/bible/chapters', { 
        number: parseInt(newChapterNumber), 
        bookId: parseInt(selectedBook) 
      });
      setChapters([...chapters, response.data]);
      setNewChapterNumber('');
    } catch (error) {
      setError('Failed to create chapter');
    } finally {
      setLoading(false);
    }
  }

  async function saveVerses() {
    if (!selectedChapter) return;
    try {
      setLoading(true);
      const validVerses = verses.filter(v => v.text.trim());
      await axios.post('/api/admin/bible/verses', { 
        verses: validVerses, 
        chapterId: parseInt(selectedChapter) 
      });
      alert('Verses saved successfully');
    } catch (error) {
      setError('Failed to save verses');
    } finally {
      setLoading(false);
    }
  }

  function updateVerseText(index: number, text: string) {
    const newVerses = [...verses];
    newVerses[index].text = text;
    setVerses(newVerses);
  }

  function addVerse() {
    setVerses([...verses, { number: verses.length + 1, text: '' }]);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Bible Administration</h1>

      {/* Create Version */}
      <Card>
        <CardHeader>
          <CardTitle>Create Bible Version</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Version name (e.g., NIV, ESV)"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
          />
          <Button onClick={createVersion} disabled={loading}>
            Create Version
          </Button>
        </CardContent>
      </Card>

      {/* Version Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Version</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Bible version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id.toString()}>
                  {version.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Create Book */}
      {selectedVersion && (
        <Card>
          <CardHeader>
            <CardTitle>Create Book</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Book name (e.g., Genesis, Matthew)"
              value={newBook}
              onChange={(e) => setNewBook(e.target.value)}
            />
            <Button onClick={createBook} disabled={loading}>
              Create Book
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Book Selection */}
      {selectedVersion && (
        <Card>
          <CardHeader>
            <CardTitle>Select Book</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBook} onValueChange={setSelectedBook}>
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
          </CardContent>
        </Card>
      )}

      {/* Create Chapter */}
      {selectedBook && (
        <Card>
          <CardHeader>
            <CardTitle>Create Chapter</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="number"
              placeholder="Chapter number"
              value={newChapterNumber}
              onChange={(e) => setNewChapterNumber(e.target.value)}
            />
            <Button onClick={createChapter} disabled={loading}>
              Create Chapter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chapter Selection */}
      {selectedBook && (
        <Card>
          <CardHeader>
            <CardTitle>Select Chapter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChapter} onValueChange={setSelectedChapter}>
              <SelectTrigger>
                <SelectValue placeholder="Select a chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id.toString()}>
                    Chapter {chapter.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Verse Entry */}
      {selectedChapter && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Verses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {verses.map((verse, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Label className="w-12 mt-2 text-right">{verse.number}.</Label>
                <Textarea
                  placeholder={`Verse ${verse.number} text`}
                  value={verse.text}
                  onChange={(e) => updateVerseText(index, e.target.value)}
                  className="flex-1"
                />
              </div>
            ))}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={addVerse}>
                + Add Verse
              </Button>
              <Button onClick={saveVerses} disabled={loading}>
                {loading ? 'Saving...' : 'Save Verses'}
              </Button>
            </div>
            
            {error && <p className="text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}