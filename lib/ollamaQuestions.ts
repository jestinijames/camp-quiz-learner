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
You are an expert Bible quiz generator. Your questions must be 100% ACCURATE to the passage while being CHALLENGING enough that careless readers will make mistakes.

PASSAGE: ${passage}
RANGE: ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}

ABSOLUTE RULES:
1. OUTPUT ONLY VALID JSON ARRAY - No markdown, no explanations, no preamble, no extra text
2. Every answer must be DIRECTLY verifiable from the passage - never infer or add external knowledge
3. Use EXACT wording from the passage in questions and answers
4. All verse references must be within ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}
5. Generate EXACTLY 10 UNIQUE questions covering DIFFERENT parts of the passage

DIFFICULTY STRATEGY:
- Test PRECISE details (specific words, exact order, particular phrasing)
- Focus on easily confused elements (similar names, numbers, sequences)
- Challenge assumptions (what seems obvious but isn't stated)
- Reward careful reading while punishing skimming

${questionType === 'FILL_IN_BLANK' ? `
FILL IN THE BLANK REQUIREMENTS:
- Remove SPECIFIC, SIGNIFICANT words/phrases (not generic words like "the" or "and")
- The blank should test exact vocabulary from the passage
- Make blanks that could plausibly be confused with similar concepts
- Use complete sentences with natural flow
- The answer must be the EXACT phrase from the passage

EXAMPLE FORMAT:
[
  {
    "type": "FILL_IN_BLANK",
    "text": "Paul says he gives thanks for the grace of God which was given to you in _____.",
    "answer": "Christ Jesus",
    "verseRef": "1:4",
    "points": 15
  },
  {
    "type": "FILL_IN_BLANK",
    "text": "In every way you were enriched in him in all _____ and all _____.",
    "answer": "speech and knowledge",
    "verseRef": "1:5",
    "points": 15
  }
]

TACTICS FOR DIFFICULTY:
- Choose words that could be confused with similar terms elsewhere in the Bible
- Test precise phrasing where small differences matter
- Focus on specific numbers, names, or sequential details
- Remove words that complete important theological or narrative points` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
MULTIPLE CHOICE REQUIREMENTS:
- ONE option must be clearly correct based on the passage
- THREE options must be plausible but definitively wrong
- Wrong options should be tricky: use similar wording, related concepts, or near-misses
- Never use obviously absurd distractors
- All options should be similar in length and complexity

EXAMPLE FORMAT:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "What does Paul say was given to the Corinthians by the grace of God?",
    "options": [
      "Faith and perseverance in Christ Jesus",
      "Enrichment in speech and knowledge in Christ Jesus",
      "Unity and fellowship in Christ Jesus",
      "Spiritual gifts and wisdom in Christ Jesus"
    ],
    "answer": "Enrichment in speech and knowledge in Christ Jesus",
    "verseRef": "1:5",
    "points": 15
  }
]

TACTICS FOR DIFFICULTY:
- Use words from the passage in wrong answers but in incorrect contexts
- Mix details from different verses to create plausible-sounding options
- Test precise wording (e.g., "enriched in" vs "blessed with")
- Include concepts that are biblical but not in THIS passage
- Make all options sound equally authoritative and specific` : ''}

${questionType === 'DESCRIPTIVE' ? `
DESCRIPTIVE REQUIREMENTS:
- Ask for analysis, explanation, or interpretation based ONLY on passage content
- Provide a comprehensive answer with specific details from the text
- Include 3-5 relevant keywords that should appear in a correct response
- Questions should require understanding, not just recall
- Answers must be defensible solely from the provided passage

EXAMPLE FORMAT:
[
  {
    "type": "DESCRIPTIVE",
    "text": "Explain Paul's strategy in his opening thanksgiving and what it reveals about his relationship with the Corinthians.",
    "answer": "Paul begins by affirming the Corinthians' spiritual status, emphasizing that grace was given to them in Christ Jesus and that they were enriched in all speech and knowledge. This establishes goodwill by recognizing their giftedness. He reinforces that the testimony about Christ was confirmed among them, showing their legitimate connection to the gospel. By noting they are not lacking in any gift while waiting for Christ's revelation, he builds confidence. Finally, he assures them that God will sustain them to the end, guiltless on the day of Christ, grounding their hope in God's faithfulness rather than their own merit.",
    "verseRef": "1:4-9",
    "points": 20,
    "keywords": ["grace", "enriched", "testimony", "confirmed", "sustained", "faithful"]
  }
]

TACTICS FOR DIFFICULTY:
- Require synthesis of multiple verses, not just one detail
- Ask "why" or "how" questions that demand understanding of relationships
- Test recognition of literary techniques, rhetorical strategies, or progression
- Require identification of cause-and-effect or purpose
- Challenge understanding of theological implications within the passage` : ''}

CRITICAL: Generate questions that will catch someone who:
- Reads too quickly and misses key words
- Confuses this passage with similar passages elsewhere
- Makes assumptions about what "should" be there
- Doesn't notice precise wording or specific details
- Thinks they know the answer without checking the text

GENERATE JSON ARRAY NOW:
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