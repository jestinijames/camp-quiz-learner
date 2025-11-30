/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus,  Users, Save, BookOpen, Sparkles, Bot, Wand2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type BibleBook = {
  id: number;
  name: string;
  versionId: number;
  version: {
    name: string;
  };
  chapters: {
    id: number;
    number: number;
    verses: {
      id: number;
      number: number;
      text: string;
    }[];
  }[];
};

type QuestionData = {
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string[];
  answer: string;
  points: number;
  verseRef?: string; // For AI generated questions
};

export default function CreateQuizPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [bibleBooks, setBibleBooks] = useState<BibleBook[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quiz metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<string>('');

  // Verse range selection
  const [fromChapter, setFromChapter] = useState<string>('');
  const [fromVerse, setFromVerse] = useState<string>('');
  const [toChapter, setToChapter] = useState<string>('');
  const [toVerse, setToVerse] = useState<string>('');

  // AI Question Generation
  const [useAIQuestions, setUseAIQuestions] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<QuestionData[]>([
    { type: 'FILL_IN_BLANK', text: '', answer: '', points: 10 },
    { type: 'MULTIPLE_CHOICE', text: '', options: ['', '', '', ''], answer: '', points: 10 },
    { type: 'DESCRIPTIVE', text: '', answer: '', points: 10 }
  ]);

  // Load Bible books with chapters and verses
  useEffect(() => {
    const fetchBibleBooks = async () => {
      setLoading(true);
      try {
        console.log('Fetching Bible books...');
        const response = await fetch('/api/admin/bible/books?includeVerses=true');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const books = await response.json();
          console.log('Books fetched:', books.length);
          setBibleBooks(books);
        } else {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          setError('Failed to load Bible books. Please try again.');
        }
      } catch (error) {
        console.error('Failed to fetch Bible books:', error);
        setError('Failed to connect to server. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchBibleBooks();
  }, []);

  // Reset verse selections when book changes
  useEffect(() => {
    setFromChapter('');
    setFromVerse('');
    setToChapter('');
    setToVerse('');
    setUseAIQuestions(false); // Reset AI when book changes
  }, [selectedBookId]);

  // Reset verse selections when chapter changes
  useEffect(() => {
    setFromVerse('');
    setUseAIQuestions(false); // Reset AI when verses change
  }, [fromChapter]);

  useEffect(() => {
    setToVerse('');
    setUseAIQuestions(false); // Reset AI when verses change
  }, [toChapter]);

  const getSelectedBook = () => {
    return bibleBooks.find(book => book.id.toString() === selectedBookId);
  };

  const getChaptersForBook = () => {
    return getSelectedBook()?.chapters || [];
  };

  const getVersesForChapter = (chapterNumber: string) => {
    const book = getSelectedBook();
    if (!book || !chapterNumber) return [];
    
    const chapter = book.chapters.find(ch => ch.number.toString() === chapterNumber);
    return chapter?.verses || [];
  };

  const getSelectedVerses = () => {
    const book = getSelectedBook();
    if (!book || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return [];
    }

    const verses = [];
    const fromChNum = parseInt(fromChapter);
    const toChNum = parseInt(toChapter);
    const fromVNum = parseInt(fromVerse);
    const toVNum = parseInt(toVerse);

    for (let chNum = fromChNum; chNum <= toChNum; chNum++) {
      const chapter = book.chapters.find(ch => ch.number === chNum);
      if (!chapter) continue;

      for (const verse of chapter.verses) {
        if (chNum === fromChNum && verse.number < fromVNum) continue;
        if (chNum === toChNum && verse.number > toVNum) continue;
        
        verses.push({
          chapter: chNum,
          verse: verse.number,
          text: verse.text
        });
      }
    }

    return verses;
  };

  const generateQuestionsWithAI = async () => {
    setGeneratingAI(true);
    setError('');
    setSuccess('');
    
    try {
      const book = getSelectedBook();
      if (!book) {
        setError('Please select a Bible book first');
        return;
      }

      // Generate 10 of each type (30 total)
      const questionTypes = ['FILL_IN_BLANK', 'MULTIPLE_CHOICE', 'DESCRIPTIVE'];
      const allQuestions: QuestionData[] = [];

      for (const type of questionTypes) {
        console.log(`Generating 10 ${type} questions...`);
        
        const response = await fetch('/api/admin/generate-questions-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: book.version.name,
            book: book.name,
            fromChapter: parseInt(fromChapter),
            fromVerse: parseInt(fromVerse),
            toChapter: parseInt(toChapter),
            toVerse: parseInt(toVerse),
            questionType: type,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to generate ${type} questions: ${errorData.error}`);
        }

        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          // Add type-specific order numbers
          const typedQuestions = data.questions.slice(0, 10).map((q: any, index: number) => ({
            type: q.type,
            text: q.text,
            options: q.options,
            answer: q.answer,
            points: q.points || 10,
            verseRef: q.verseRef,
            order: allQuestions.length + index + 1 // Sequential order across all types
          }));
          
          allQuestions.push(...typedQuestions);
        }
      }

      if (allQuestions.length === 30) {
        setQuestions(allQuestions);
        setUseAIQuestions(true);
        setSuccess(`🎉 Generated 30 questions! (10 Fill-in-Blank, 10 Multiple Choice, 10 Descriptive)`);
      } else {
        setError(`Only generated ${allQuestions.length} questions. Expected 30.`);
      }

    } catch (error: any) {
      console.error('AI Generation error:', error);
      setError(`AI Generation failed: ${error.message}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const resetToManualQuestions = () => {
    setQuestions([
      { type: 'FILL_IN_BLANK', text: '', answer: '', points: 10 },
      { type: 'MULTIPLE_CHOICE', text: '', options: ['', '', '', ''], answer: '', points: 10 },
      { type: 'DESCRIPTIVE', text: '', answer: '', points: 10 }
    ]);
    setUseAIQuestions(false);
    setSuccess('Switched back to manual question entry');
  };

  const updateQuestion = (index: number, field: keyof QuestionData, value: QuestionData[keyof QuestionData]) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateMultipleChoiceOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options || [])];
    options[optionIndex] = value;
    updated[questionIndex] = { ...updated[questionIndex], options };
    setQuestions(updated);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!title || !selectedBookId) {
        setError('Please provide a title and select a Bible book');
        return;
      }

      if (!fromChapter || !fromVerse || !toChapter || !toVerse) {
        setError('Please select the verse range for the quiz');
        return;
      }

      // Updated validation for different quiz types
      if (useAIQuestions) {
        // AI-generated quiz should have 30 questions
        if (questions.length !== 30) {
          setError(`AI-generated quiz should have 30 questions, but has ${questions.length}`);
          return;
        }
        
        const fillInBlank = questions.filter(q => q.type === 'FILL_IN_BLANK').length;
        const multipleChoice = questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
        const descriptive = questions.filter(q => q.type === 'DESCRIPTIVE').length;
        
        if (fillInBlank !== 10 || multipleChoice !== 10 || descriptive !== 10) {
          setError(`Invalid question distribution. Expected 10 of each type, got: ${fillInBlank} fill-in-blank, ${multipleChoice} multiple choice, ${descriptive} descriptive`);
          return;
        }
      } else {
        // Manual quiz should have exactly 3 questions
        if (questions.length !== 3) {
          setError('Manual quiz must have exactly 3 questions');
          return;
        }
        
        if (questions.some(q => !q.text || !q.answer)) {
          setError('Please complete all questions and answers');
          return;
        }
        
        // Validate multiple choice questions have options
        const mcQuestions = questions.filter(q => q.type === 'MULTIPLE_CHOICE');
        for (const mcq of mcQuestions) {
          if (!mcq.options || mcq.options.some(opt => !opt.trim())) {
            setError('Please provide all options for multiple choice questions');
            return;
          }
        }
      }

      // Validate verse range
      const fromChNum = parseInt(fromChapter);
      const toChNum = parseInt(toChapter);
      const fromVNum = parseInt(fromVerse);
      const toVNum = parseInt(toVerse);

      if (fromChNum > toChNum || (fromChNum === toChNum && fromVNum > toVNum)) {
        setError('Invalid verse range: "From" must come before "To"');
        return;
      }

      const quizData = {
        title,
        description,
        bookId: parseInt(selectedBookId),
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        isActive: !isDraft,
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        questions: questions.map((q, index) => ({
          ...q,
          order: index + 1,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options : null // Keep as array, API will handle JSON.stringify
        }))
      };

      const response = await fetch('/api/admin/quiz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(isDraft ? 'Quiz saved as draft!' : `🎉 ${result.type === 'AI-generated' ? 'AI-generated quiz' : 'Manual quiz'} created with ${result.questionCount} questions!`);
        
        if (!isDraft) {
          // Reset form
          setTitle('');
          setDescription('');
          setSelectedBookId('');
          setTimeLimit('');
          setFromChapter('');
          setFromVerse('');
          setToChapter('');
          setToVerse('');
          setQuestions([
            { type: 'FILL_IN_BLANK', text: '', answer: '', points: 10 },
            { type: 'MULTIPLE_CHOICE', text: '', options: ['', '', '', ''], answer: '', points: 10 },
            { type: 'DESCRIPTIVE', text: '', answer: '', points: 10 }
          ]);
          setUseAIQuestions(false);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create quiz');
      }
    } catch (error) {
      setError('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'FILL_IN_BLANK': return 'Fill in the Blank';
      case 'MULTIPLE_CHOICE': return 'Multiple Choice';
      case 'DESCRIPTIVE': return 'Descriptive Answer';
      default: return type;
    }
  };

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-6 w-6" />
            <span>Create New Quiz</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Genesis Chapter 1 Quiz"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Optional (e.g., 30)"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional quiz description"
              rows={3}
            />
          </div>

          {/* Scripture Selection */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Scripture Passage Selection *</span>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the Bible passage that members will read before taking the quiz
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bible Book Selection */}
              <div className="space-y-2">
                <Label>Bible Book *</Label>
                {loading ? (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span>Loading Bible books...</span>
                  </div>
                ) : (
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a Bible book" />
                    </SelectTrigger>
                    <SelectContent>
                      {bibleBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id.toString()}>
                          {book.name} ({book.version.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Verse Range Selection */}
              {selectedBookId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* From Chapter */}
                  <div className="space-y-2">
                    <Label>From Chapter *</Label>
                    <Select value={fromChapter} onValueChange={setFromChapter}>
                      <SelectTrigger className="h-10">
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
                      value={fromVerse} 
                      onValueChange={setFromVerse}
                      disabled={!fromChapter}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Verse" />
                      </SelectTrigger>
                      <SelectContent>
                        {getVersesForChapter(fromChapter).map((verse) => (
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
                    <Select value={toChapter} onValueChange={setToChapter}>
                      <SelectTrigger className="h-10">
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
                      value={toVerse} 
                      onValueChange={setToVerse}
                      disabled={!toChapter}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Verse" />
                      </SelectTrigger>
                      <SelectContent>
                        {getVersesForChapter(toChapter).map((verse) => (
                          <SelectItem key={verse.id} value={verse.number.toString()}>
                            {verse.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Preview Selected Verses */}
              {getSelectedVerses().length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">
                    Preview: Selected Passage ({getSelectedVerses().length} verses)
                  </h4>
                  <div className="max-h-40 overflow-y-auto text-sm">
                    {getSelectedVerses().slice(0, 5).map((verse, index) => (
                      <p key={index} className="mb-1">
                        <span className="font-medium text-blue-600">
                          {verse.chapter}:{verse.verse}
                        </span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">
                          {verse.text}
                        </span>
                      </p>
                    ))}
                    {getSelectedVerses().length > 5 && (
                      <p className="text-gray-500 italic">
                        ... and {getSelectedVerses().length - 5} more verses
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Question Generation Section */}
          {selectedBookId && fromChapter && fromVerse && toChapter && toVerse && (
            <Card className="border-l-4 border-l-purple-500 bg-linear-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <span>AI Question Generator</span>
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate 30 intelligent questions (10 of each type) from the selected passage
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Info about what will be generated */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      📋 What will be generated:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">📝</span>
                        <span>10 Fill-in-Blank questions</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-600">🎯</span>
                        <span>10 Multiple Choice questions</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✍️</span>
                        <span>10 Descriptive questions</span>
                      </div>
                    </div>
                  </div>

                  {/* Generate Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    {!useAIQuestions ? (
                      <Button 
                        onClick={generateQuestionsWithAI} 
                        disabled={generatingAI}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-2 h-11"
                      >
                        {generatingAI ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating 30 Questions...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Wand2 className="h-4 w-4" />
                            <span>Generate 30 Questions</span>
                            <Sparkles className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    ) : (
                      <div className="flex space-x-3">
                        <Button 
                          onClick={generateQuestionsWithAI} 
                          disabled={generatingAI}
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50 px-4 py-2 h-11"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate All 30
                        </Button>
                        <Button 
                          onClick={resetToManualQuestions}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 h-11"
                        >
                          Switch to Manual
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* AI Status Indicator */}
                  {useAIQuestions && (
                    <div className="flex items-center space-x-2 text-sm text-purple-600 bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
                      <Bot className="h-4 w-4" />
                      <span className="font-medium">30 AI-Generated Questions Ready</span>
                      <span className="text-purple-500">• Members will get 3 random questions (1 of each type)</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Quiz Questions</h3>
              {useAIQuestions && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
            
            {questions.map((question, index) => (
              <Card key={index} className={`border-l-4 ${useAIQuestions ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <span>Question {index + 1}: {getQuestionTypeLabel(question.type)}</span>
                      {question.verseRef && (
                        <Badge variant="outline" className="text-xs">
                          {question.verseRef}
                        </Badge>
                      )}
                    </CardTitle>
                    <Badge variant="outline">
                      {question.points} points
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Text */}
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      placeholder="Enter your question..."
                      rows={3}
                      className={useAIQuestions ? 'bg-purple-50 dark:bg-purple-900/10' : ''}
                    />
                  </div>

                  {/* Multiple Choice Options */}
                  {question.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      <Label>Answer Options *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options?.map((option, optIndex) => (
                          <Input
                            key={optIndex}
                            value={option}
                            onChange={(e) => updateMultipleChoiceOption(index, optIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            className={`h-10 ${useAIQuestions ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="space-y-2">
                    <Label>
                      {question.type === 'MULTIPLE_CHOICE' ? 'Correct Answer (select option) *' : 'Correct Answer *'}
                    </Label>
                    {question.type === 'MULTIPLE_CHOICE' ? (
                      <Select
                        value={question.answer}
                        onValueChange={(value) => updateQuestion(index, 'answer', value)}
                      >
                        <SelectTrigger className={`h-10 ${useAIQuestions ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.map((option, optIndex) => (
                            option && (
                              <SelectItem key={optIndex} value={option}>
                                {String.fromCharCode(65 + optIndex)}: {option}
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Textarea
                        value={question.answer}
                        onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                        placeholder="Enter the correct answer..."
                        rows={2}
                        className={useAIQuestions ? 'bg-purple-50 dark:bg-purple-900/10' : ''}
                      />
                    )}
                  </div>

                  {/* Points */}
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 10)}
                      min="1"
                      max="100"
                      className={`h-10 w-32 ${useAIQuestions ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              onClick={() => handleSubmit(true)}
              variant="outline"
              disabled={loading || generatingAI}
              className="h-10"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading || generatingAI}
              className="h-10"
            >
              <Users className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Publish Quiz'}
            </Button>
          </div>

          {/* Messages */}
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

      {/* Generated Question Pool Section (newly added) */}
      {useAIQuestions && questions.length === 30 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <span>Generated Question Pool (30 Questions)</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Members will get 1 random question from each type during their quiz
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fill in Blank Questions */}
            <div>
              <h4 className="font-semibold text-blue-600 mb-3">📝 Fill in the Blank (10 questions)</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {questions.filter(q => q.type === 'FILL_IN_BLANK').map((q, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded text-sm">
                    <strong>Q{idx + 1}:</strong> {q.text}
                    <br />
                    <span className="text-blue-600">Answer: {q.answer}</span>
                    {q.verseRef && <span className="text-gray-500"> • {q.verseRef}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Multiple Choice Questions */}
            <div>
              <h4 className="font-semibold text-purple-600 mb-3">🎯 Multiple Choice (10 questions)</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {questions.filter(q => q.type === 'MULTIPLE_CHOICE').map((q, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded text-sm">
                    <strong>Q{idx + 1}:</strong> {q.text}
                    <br />
                    <span className="text-purple-600">Answer: {q.answer}</span>
                    {q.verseRef && <span className="text-gray-500"> • {q.verseRef}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptive Questions */}
            <div>
              <h4 className="font-semibold text-green-600 mb-3">✍️ Descriptive (10 questions)</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {questions.filter(q => q.type === 'DESCRIPTIVE').map((q, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded text-sm">
                    <strong>Q{idx + 1}:</strong> {q.text}
                    <br />
                    <span className="text-green-600">Sample Answer: {q.answer.substring(0, 100)}...</span>
                    {q.verseRef && <span className="text-gray-500"> • {q.verseRef}</span>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}