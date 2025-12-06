/* eslint-disable @typescript-eslint/no-explicit-any */
export type GeneratedQuestion = {
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string[];
  answer: string;
  verseRef: string;
  points: number;
  keywords?: string[];
};

export async function generate10Questions(
  version: string,
  book: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  passage: string,
  questionType: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE'
): Promise<GeneratedQuestion[]> {
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are a Bible quiz generator. Generate EXACTLY 10 UNIQUE and DIVERSE ${questionType} questions from this passage.

PASSAGE: ${passage}
RANGE: ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}

CRITICAL REQUIREMENTS:
1. Respond with ONLY a valid JSON array. No markdown, no explanations, no extra text.
2. Each question must be UNIQUE and focus on different aspects of the passage
3. Use exact words and phrases from the provided passage
4. All verse references must be within the given range
5. Questions must be directly answerable from the passage content
6. Create challenging questions that require careful reading - wrong answers should be plausible but clearly incorrect based on the passage content

${questionType === 'FILL_IN_BLANK' ? `
JSON FORMAT:
[
  {
    "type": "FILL_IN_BLANK",
    "text": "Paul gives thanks for the _____ that was given to you by the grace of God.",
    "answer": "speech and knowledge",
    "verseRef": "1:5",
    "points": 15
  }
]

Focus on: specific words, phrases, names, actions, descriptions from the passage` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
JSON FORMAT:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "What does Paul thank God for regarding the Corinthians?",
    "options": [
      "Their faith and perseverance",
      "Their grace given in speech and knowledge", 
      "Their unity and fellowship",
      "Their generous giving"
    ],
    "answer": "Their grace given in speech and knowledge",
    "verseRef": "1:5",
    "points": 15
  }
]

Create options where only ONE is clearly correct from the passage` : ''}

${questionType === 'DESCRIPTIVE' ? `
JSON FORMAT:
[
  {
    "type": "DESCRIPTIVE",
    "text": "Analyze Paul's thanksgiving strategy in this opening passage.",
    "answer": "Paul establishes rapport by highlighting the Corinthians' spiritual giftedness, emphasizing God's grace in their lives, and building confidence in God's faithfulness for future perseverance.",
    "verseRef": "1:4-9", 
    "points": 20,
    "keywords": ["thanksgiving", "strategy", "rapport", "spiritual gifts"]
  }
]

Focus on analysis, explanation, interpretation based on the passage content` : ''}

GENERATE JSON ARRAY NOW - NO OTHER TEXT:
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama service unavailable: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';
    
    console.log('Raw Ollama response length:', text.length);
    console.log('Raw Ollama response preview:', text.substring(0, 200));

    if (!text) {
      throw new Error('Empty response from Ollama');
    }

    // Try multiple parsing approaches
    const questions = await tryMultipleParsingApproaches(text, questionType, fromChapter, fromVerse, toChapter, toVerse);
    
    if (questions.length === 0) {
      throw new Error('Could not extract any valid questions from AI response');
    }

    // Remove duplicates
    const uniqueQuestions = removeDuplicateQuestions(questions);
    
    console.log(`Successfully generated ${uniqueQuestions.length} unique questions from AI`);
    return uniqueQuestions.slice(0, 10);

  } catch (error: any) {
    console.error('AI question generation failed:', error.message);
    
    // Only use fallback if Ollama service is completely unavailable
    if (error.message.includes('Ollama service unavailable') || 
        error.message.includes('fetch') || 
        error.message.includes('ECONNREFUSED')) {
      
      console.log('Ollama service is down, using fallback questions');
      return createMinimalFallbackQuestions(questionType, book, fromChapter, fromVerse, toChapter, toVerse);
    }
    
    // For other errors, throw to let the user know AI generation failed
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

async function tryMultipleParsingApproaches(
  text: string,
  questionType: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number
): Promise<GeneratedQuestion[]> {
  
  // Approach 1: Standard JSON parsing
  try {
    const questions = extractAndParseJSON(text, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (questions.length > 0) {
      console.log('✅ Standard JSON parsing successful');
      return questions;
    }
  } catch (error) {
    console.log('❌ Standard JSON parsing failed:', error);
  }

  // Approach 2: Try to fix common AI response issues
  try {
    const cleanedText = fixCommonAIIssues(text);
    const questions = extractAndParseJSON(cleanedText, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (questions.length > 0) {
      console.log('✅ Fixed AI issues and parsed successfully');
      return questions;
    }
  } catch (error) {
    console.log('❌ AI fix approach failed:', error);
  }

  // Approach 3: Try to extract individual question objects
  try {
    const questions = extractIndividualQuestions(text, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (questions.length > 0) {
      console.log('✅ Individual question extraction successful');
      return questions;
    }
  } catch (error) {
    console.log('❌ Individual extraction failed:', error);
  }

  return [];
}

function fixCommonAIIssues(text: string): string {
  return text
    // Remove markdown code blocks
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .replace(/`/g, '')
    
    // Remove common AI prefixes
    .replace(/^(here is|here are|the json array is|json array:)/i, '')
    .replace(/^(generated questions?:?)/i, '')
    
    // Fix smart quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    
    // Remove any text before the first [
    .replace(/^[^[]*/, '')
    
    // Remove any text after the last ]
    .replace(/[^\]]*$/, '')
    
    .trim();
}

function extractIndividualQuestions(
  text: string,
  questionType: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number
): GeneratedQuestion[] {
  
  const questions: GeneratedQuestion[] = [];
  
  // Try to find individual question objects using regex
  const questionRegex = /\{[^{}]*"type"\s*:\s*"[^"]*"[^{}]*\}/g;
  const matches = text.match(questionRegex);
  
  if (!matches) {
    throw new Error('No question objects found');
  }

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      const cleaned = cleanQuestion(parsed, questionType, fromChapter, fromVerse, toChapter, toVerse);
      if (cleaned) {
        questions.push(cleaned);
      }
    } catch (error) {
      console.warn('Failed to parse individual question:', match);
    }
  }

  return questions;
}

function removeDuplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const unique = [];
  const seenTexts = new Set();
  
  for (const q of questions) {
    const normalizedText = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (!seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      unique.push(q);
    }
  }
  
  return unique;
}

function extractAndParseJSON(
  text: string, 
  questionType: string,
  fromChapter: number,
  fromVerse: number, 
  toChapter: number,
  toVerse: number
): GeneratedQuestion[] {
  
  const startIndex = text.indexOf('[');
  const endIndex = text.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('No JSON array found in response');
  }

  const jsonText = text.slice(startIndex, endIndex + 1);
  const parsed = JSON.parse(jsonText);
  
  if (!Array.isArray(parsed)) {
    throw new Error('Parsed result is not an array');
  }
  
  const questions: GeneratedQuestion[] = [];
  for (const q of parsed) {
    if (!q || typeof q !== 'object') continue;
    
    const cleanedQuestion = cleanQuestion(q, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (cleanedQuestion) {
      questions.push(cleanedQuestion);
    }
  }
  
  return questions;
}

function cleanQuestion(
  q: any, 
  expectedType: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number
): GeneratedQuestion | null {
  
  try {
    if (!q.text || !q.answer) {
      return null;
    }
    
    const text = String(q.text).trim();
    const answer = String(q.answer).trim();
    
    if (text.length < 10 || answer.length < 1) {
      return null;
    }
    
    const type = q.type || expectedType;
    if (!['FILL_IN_BLANK', 'MULTIPLE_CHOICE', 'DESCRIPTIVE'].includes(type)) {
      return null;
    }
    
    let verseRef = q.verseRef || `${fromChapter}:${fromVerse}`;
    if (typeof verseRef !== 'string' || !verseRef.includes(':')) {
      verseRef = `${fromChapter}:${fromVerse}`;
    }
    
    let options: string[] | undefined;
    if (type === 'MULTIPLE_CHOICE') {
      if (Array.isArray(q.options) && q.options.length >= 4) {
        options = q.options.map((opt: any) => String(opt).trim());
      } else {
        return null; // Skip invalid multiple choice questions
      }
    }
    
    let keywords: string[] | undefined;
    if (type === 'DESCRIPTIVE' && Array.isArray(q.keywords)) {
      keywords = q.keywords.map((kw: any) => String(kw).trim());
    }
    
    return {
      type: type as 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE',
      text,
      options,
      answer,
      verseRef,
      points: q.points || (type === 'DESCRIPTIVE' ? 20 : 15),
      keywords
    };
    
  } catch (error) {
    return null;
  }
}

// Only used when Ollama service is completely down
function createMinimalFallbackQuestions(
  questionType: string,
  book: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number
): GeneratedQuestion[] {
  
  console.warn('🚨 Creating minimal fallback questions - AI service unavailable');
  
  const fallbackQuestions: GeneratedQuestion[] = [];
  const verseRef = `${fromChapter}:${fromVerse}`;
  
  // Create just a few basic questions when AI is completely down
  for (let i = 0; i < 5; i++) {
    if (questionType === 'FILL_IN_BLANK') {
      fallbackQuestions.push({
        type: 'FILL_IN_BLANK',
        text: `Complete this thought from ${book} ${verseRef}: "The passage mentions _____ as a key concept."`,
        answer: 'God',
        verseRef,
        points: 15
      });
    } else if (questionType === 'MULTIPLE_CHOICE') {
      fallbackQuestions.push({
        type: 'MULTIPLE_CHOICE',
        text: `What is discussed in ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}?`,
        options: ['Biblical truth', 'Historical events', 'Scientific facts', 'Political matters'],
        answer: 'Biblical truth',
        verseRef,
        points: 15
      });
    } else {
      fallbackQuestions.push({
        type: 'DESCRIPTIVE',
        text: `Describe the main theme of ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}.`,
        answer: 'This passage contains important biblical content that requires careful study and reflection.',
        verseRef,
        points: 20,
        keywords: ['biblical', 'theme', 'study']
      });
    }
  }
  
  return fallbackQuestions;
}
