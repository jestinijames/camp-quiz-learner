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
  
  console.log('🤖 Generating 15 questions with ChatGPT (OpenAI)...');
  const questions = await generateWithChatGPT(
    version, book, fromChapter, fromVerse, toChapter, toVerse, passage, questionType
  );
  console.log('✅ ChatGPT generation successful');
  return questions;
}

async function generateWithChatGPT(
  version: string,
  book: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  passage: string,
  questionType: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE'
): Promise<GeneratedQuestion[]> {
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY not configured in .env.local');
  }

  const prompt = buildPrompt(version, book, fromChapter, fromVerse, toChapter, toVerse, passage, questionType);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost-effectiveness, can use 'gpt-4o' for better quality
      messages: [
        {
          role: 'system',
          content: 'You are an expert Bible quiz generator. You MUST generate questions that are 100% accurate to the provided scripture passage. NEVER add information from outside the passage. OUTPUT ONLY VALID JSON with no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ChatGPT API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  
  if (!text) {
    throw new Error('Empty response from ChatGPT');
  }

  console.log('Raw ChatGPT response length:', text.length);

  const questions = await tryMultipleParsingApproaches(text, questionType, fromChapter, fromVerse, toChapter, toVerse);
  
  if (questions.length === 0) {
    throw new Error('Could not extract any valid questions from ChatGPT response');
  }

  const uniqueQuestions = removeDuplicateQuestions(questions);
  console.log(`Successfully generated ${uniqueQuestions.length} unique questions from ChatGPT`);
  
  // Accept whatever we can generate (minimum 10 questions)
  const MINIMUM_QUESTIONS = 10;
  const TARGET_QUESTIONS = 15;
  
  if (uniqueQuestions.length < MINIMUM_QUESTIONS) {
    console.warn(`⚠️ Only got ${uniqueQuestions.length} unique questions, need at least ${MINIMUM_QUESTIONS}`);
    throw new Error(`Insufficient unique questions generated: ${uniqueQuestions.length}/${MINIMUM_QUESTIONS} (minimum required)`);
  }
  
  // Return what we have (up to 15 questions)
  const questionsToReturn = uniqueQuestions.slice(0, TARGET_QUESTIONS);
  console.log(`✅ Returning ${questionsToReturn.length} questions (target: ${TARGET_QUESTIONS})`);
  return questionsToReturn;
}

function buildPrompt(
  version: string,
  book: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  passage: string,
  questionType: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE'
): string {
  
  // Calculate chapter distribution for balanced question generation
  const chapters = toChapter - fromChapter + 1;
  const questionsPerChapter = Math.ceil(15 / chapters);
  const chapterList = [];
  for (let i = fromChapter; i <= toChapter; i++) {
    chapterList.push(i);
  }
  
  const distributionGuide = chapters > 1 
    ? `\n🚨 MANDATORY DISTRIBUTION REQUIREMENT - READ THIS CAREFULLY:
You have ${chapters} chapters: ${chapterList.join(', ')}
You MUST generate approximately ${questionsPerChapter} questions from EACH chapter.
DO NOT take all questions from chapter ${fromChapter}!
SCAN THE ENTIRE PASSAGE from start to finish.
Pick verses from the BEGINNING, MIDDLE, and END of each chapter.
Chapter ${toChapter} is just as important as chapter ${fromChapter}!

Distribution checklist:
${chapterList.map(ch => `- Chapter ${ch}: ~${questionsPerChapter} questions from various verses`).join('\n')}`
    : `\nDISTRIBUTION: Questions should come from throughout the chapter, not just the first few verses.`;

  return `You are an expert Bible quiz generator. Your questions must be 100% ACCURATE to the passage while being CHALLENGING enough that careless readers will make mistakes.

⚠️ CRITICAL SCRIPTURE ACCURACY RULES:
1. ONLY use information that is EXPLICITLY stated in the provided passage
2. DO NOT add any information from other Bible passages or general biblical knowledge
3. DO NOT infer, assume, or extrapolate beyond what is written
4. Every word in questions and answers must be verifiable by pointing to the exact text in the passage
5. If you're tempted to use external knowledge, STOP - it's wrong

PASSAGE: ${passage}
BIBLE VERSION: ${version}
EXACT RANGE: ${book} ${fromChapter}:${fromVerse} to ${toChapter}:${toVerse}
${distributionGuide}

ABSOLUTE FORMATTING RULES:
1. OUTPUT ONLY VALID JSON ARRAY - No markdown, no code blocks, no explanations, no preamble, no extra text
2. Start your response with [ and end with ]
3. Generate EXACTLY 25 UNIQUE questions covering DIFFERENT parts of the ENTIRE passage (this ensures we get 15+ after deduplication - DO NOT GENERATE FEWER THAN 20)
4. Questions MUST be EVENLY DISTRIBUTED across all ${chapters} chapter(s) - READ THROUGH THE FULL PASSAGE and pick verses from beginning, middle, AND end
5. All verse references must be within ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}
6. ENSURE each question is COMPLETELY DIFFERENT - no similar questions, no duplicate concepts
7. COUNT YOUR QUESTIONS - You need to output at least 20-25 questions in the JSON array

🎯 ANTI-CHEATING STRATEGY:
Users will have the Bible open AND may use AI tools to find answers. Your questions must be TRICKY enough that:
- Simply reading the verse won't give the answer away quickly
- AI tools will struggle because the question requires EXACT word matching
- The correct answer "feels wrong" but is actually right
- Wrong answers "feel right" but are actually wrong

DIFFICULTY TACTICS (Make questions EXTREMELY tricky while 100% accurate):
1. **Exact Wording Tests**: Test THE, A, AN differences - "the kingdom" vs "a kingdom"
2. **Word Order**: "grace and peace" vs "peace and grace" - order matters!
3. **Singular vs Plural**: "brother" vs "brothers", "church" vs "churches"
4. **Verb Tense**: "walked" vs "was walking" vs "walks"
5. **Similar Phrases**: Use phrases that sound alike but differ by one word
6. **Number Precision**: Test exact numbers (3 vs 30, seven vs seventh)
7. **Name Variations**: Test exact name forms (Saul vs Paul, Simon vs Peter)
8. **Connector Words**: "and" vs "but" vs "or" - these change meaning
9. **Negative Questions**: Ask what is NOT mentioned (harder to AI-search)
10. **Sequential Details**: Test the ORDER events happen, not just that they happen
11. **Attribution**: WHO said/did something (easy to confuse speakers)
12. **Partial Quotes**: Use part of a verse that could come from multiple places

${questionType === 'FILL_IN_BLANK' ? `FILL IN THE BLANK - EXTREME TRICKINESS REQUIREMENTS:
- Remove SPECIFIC, SIGNIFICANT words/phrases that appear in the provided passage
- The answer must be the EXACT phrase copied directly from the passage
- Make it tricky by:
  * Testing small words that change meaning: articles (a/an/the), prepositions (in/on/at), conjunctions (and/but/or)
  * Removing words that could plausibly be multiple similar options
  * Testing exact verb forms or tenses that are easy to get wrong
  * Using sentences where the blank could grammatically fit several words
  * Testing singular vs plural forms
- NEVER use generic words like "the" alone - always test meaningful content

ANTI-AI TACTICS:
- Create blanks where AI would suggest the "theologically correct" answer that's WRONG for this passage
- Test exact phrasing that differs slightly from common Bible quotes
- Use blanks that require knowing the PRECISE word order in this version

EXAMPLE FORMAT (TRICKY):
[
  {
    "type": "FILL_IN_BLANK",
    "text": "Paul says 'I give thanks to _____ God always for you.'",
    "answer": "my",
    "verseRef": "1:4",
    "points": 5
  },
  {
    "type": "FILL_IN_BLANK",
    "text": "You were enriched in all speech and all knowledge, even as the testimony of Christ was _____ in you.",
    "answer": "confirmed",
    "verseRef": "1:5-6",
    "points": 5
  },
  {
    "type": "FILL_IN_BLANK",
    "text": "So that you are not lacking in any gift, as you wait for the _____ of our Lord Jesus Christ.",
    "answer": "revealing",
    "verseRef": "1:7",
    "points": 5
  }
]

TRICKINESS CHECKLIST:
✓ Would someone guess a synonym instead of the exact word?
✓ Does the blank test precise wording vs general meaning?
✓ Would AI suggest a different word that sounds more "biblical"?
✓ Is the answer something easily confused with similar phrases?` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `CHOOSE ONE ANSWER - UNAMBIGUOUS QUESTION REQUIREMENTS:
🚨 CRITICAL: Each question must have ONLY ONE CLEARLY CORRECT answer based on the passage.

- ONE option must be the EXACT correct answer explicitly stated in the passage
- THREE options must be CLEARLY WRONG based on the passage (not "almost right")
- The question must be specific enough that only ONE answer is scripturally accurate
- ALL options must be grammatically correct and sound plausible

⚠️ AVOID AMBIGUOUS QUESTIONS:
❌ BAD: "What is good for a man?" (Multiple correct answers: not to marry, to be celibate, etc.)
✅ GOOD: "According to verse 1, what did Paul say about a man touching a woman?" (One specific answer)

❌ BAD: "What should believers do?" (Too broad, many correct options)
✅ GOOD: "In verse 5, what specific instruction did Paul give about prayer?" (One clear answer)

QUESTION DESIGN PRINCIPLES:
1. **Be Specific**: Reference exact verse numbers and specific details
2. **Test Facts, Not Interpretations**: Ask what IS WRITTEN, not what it means
3. **One Clear Answer**: The correct answer should be indisputable from the text
4. **Wrong = Factually Incorrect**: Wrong options contradict the passage or state things not mentioned
5. **Avoid Theological Nuance**: Don't ask questions where multiple options could be theologically defended

WRONG ANSWER STRATEGIES (Make them clearly incorrect):
1. **Different Actor**: "Jesus said" when it was actually Paul who said it
2. **Different Number**: "three days" when the text says "seven days"
3. **Different Action**: "went to Jerusalem" when they went to Corinth
4. **Not Mentioned**: Include details that sound biblical but aren't in this passage
5. **Opposite Meaning**: Negate what the passage actually says
6. **Different Location/Person/Thing**: Change key nouns to make it factually wrong

Make ALL options similar length and structure, but make the wrong ones FACTUALLY INCORRECT.

EXAMPLE FORMAT (UNAMBIGUOUS):
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "In verse 4, what specifically did Paul say he always gives thanks to God for concerning the Corinthians?",
    "options": [
      "the grace of God which was given to them",
      "their faith and love",
      "their generosity and service",
      "their spiritual gifts and wisdom"
    ],
    "answer": "the grace of God which was given to them",
    "verseRef": "1:4",
    "points": 5
  },
  {
    "type": "MULTIPLE_CHOICE",
    "text": "According to verse 5, in what two specific areas were the Corinthians enriched?",
    "options": [
      "all speech and all knowledge",
      "all wisdom and all understanding",
      "all faith and all love",
      "all power and all authority"
    ],
    "answer": "all speech and all knowledge",
    "verseRef": "1:5",
    "points": 5
  },
  {
    "type": "MULTIPLE_CHOICE",
    "text": "In verse 7, what are the Corinthians waiting for while not lacking in any gift?",
    "options": [
      "the revealing of our Lord Jesus Christ",
      "the return of Paul to Corinth",
      "the coming of the Holy Spirit",
      "the judgment day"
    ],
    "answer": "the revealing of our Lord Jesus Christ",
    "verseRef": "1:7",
    "points": 5
  }
]

UNAMBIGUOUS QUESTION CHECKLIST:
✓ Does the question reference a specific verse or detail?
✓ Is there ONLY ONE answer that is factually correct from the passage?
✓ Are the wrong answers clearly incorrect based on what the text actually says?
✓ Would a careful reader who studies the passage know the right answer?
✓ Do all options sound plausible but only one matches the scripture?
✓ Could you defend why the correct answer is right and wrong answers are wrong?` : ''}

${questionType === 'DESCRIPTIVE' ? `DESCRIPTIVE - EXTREME TRICKINESS REQUIREMENTS:
- Ask for analysis that requires synthesizing MULTIPLE verses
- The answer must be defensible solely from the provided passage
- Include 3-5 specific keywords that MUST appear in a correct answer
- Make questions that test UNDERSTANDING, not just copy-paste ability

ANTI-AI & ANTI-COPY-PASTE TACTICS:
1. **Synthesis Required**: Ask questions needing multiple verses combined
2. **Implied Relationships**: Test understanding of cause-and-effect in the text
3. **Sequence/Order**: Require explaining the PROGRESSION or FLOW
4. **Contrast Questions**: Ask about differences or comparisons within the passage
5. **Purpose/Intent**: Ask WHY something is stated (based only on context clues in passage)
6. **Negative Space**: Ask what is NOT mentioned but might be expected
7. **Keyword-Specific**: Require specific theological terms from the passage

EXAMPLE FORMAT (EXTREMELY TRICKY):
[
  {
    "type": "DESCRIPTIVE",
    "text": "Based on verses 4-9, explain the logical progression of Paul's argument about the Corinthians' spiritual state and how each point builds on the previous one.",
    "answer": "Paul creates a progressive argument starting with the foundation of God's grace given in Christ Jesus (v.4), which resulted in their enrichment in speech and knowledge (v.5). This enrichment served as confirmation of the testimony about Christ among them (v.6), which in turn means they lack no spiritual gift (v.7). The progression continues as they wait for Christ's revelation (v.7), assured that God himself will sustain them to the end and keep them guiltless (v.8), all grounded in God's faithfulness who called them into fellowship with his Son (v.9). Each element depends on and flows from the previous one.",
    "verseRef": "1:4-9",
    "points": 20,
    "keywords": ["grace", "enriched", "confirmed", "testimony", "sustain", "faithful", "progression"]
  },
  {
    "type": "DESCRIPTIVE",
    "text": "Identify and explain the three-fold relationship Paul establishes between God's past action, present reality, and future assurance in verses 4-8.",
    "answer": "Past action: God gave grace in Christ Jesus and enriched the Corinthians (v.4-5). Present reality: The testimony of Christ has been confirmed in them, and they currently lack no gift as they wait (v.6-7). Future assurance: God will sustain them to the end, ensuring they are guiltless on the day of Christ (v.8). This three-fold structure shows God's complete involvement across all time.",
    "verseRef": "1:4-8",
    "points": 20,
    "keywords": ["gave", "enriched", "confirmed", "lacking", "sustain", "guiltless"]
  }
]

TRICKINESS CHECKLIST:
✓ Does the question require reading 3+ verses to answer fully?
✓ Would copying a single verse NOT give the complete answer?
✓ Are the keywords specific enough that generic Bible knowledge won't work?
TRICKINESS CHECKLIST:
✓ Does the question require reading 3+ verses to answer fully?
✓ Would copying a single verse NOT give the complete answer?
✓ Are the keywords specific enough that generic Bible knowledge won't work?
✓ Does answering require understanding relationships between ideas?
✓ Would AI struggle because it needs SYNTHESIS not just LOOKUP?` : ''}

FINAL ACCURACY CHECK before generating:
1. Read the passage again carefully
2. Ensure EVERY detail in your questions comes from the passage
3. Verify verse references are within ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}
4. Double-check you haven't added external Bible knowledge

GENERATE JSON ARRAY NOW (Start with [ and end with ]):
`.trim();
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
  } catch {
    console.log('❌ Standard JSON parsing failed');
  }

  // Approach 2: Try to fix common AI response issues
  try {
    const cleanedText = fixCommonAIIssues(text);
    const questions = extractAndParseJSON(cleanedText, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (questions.length > 0) {
      console.log('✅ Fixed AI issues and parsed successfully');
      return questions;
    }
  } catch {
    console.log('❌ AI fix approach failed');
  }

  // Approach 3: Try to extract individual question objects
  try {
    const questions = extractIndividualQuestions(text, questionType, fromChapter, fromVerse, toChapter, toVerse);
    if (questions.length > 0) {
      console.log('✅ Individual question extraction successful');
      return questions;
    }
  } catch {
    console.log('❌ Individual extraction failed');
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
    } catch {
      console.warn('Failed to parse individual question');
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _toChapter: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _toVerse: number
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
    
    // Set points based on question type
    let points = q.points;
    if (!points) {
      if (type === 'FILL_IN_BLANK') points = 5;
      else if (type === 'MULTIPLE_CHOICE') points = 5;
      else if (type === 'DESCRIPTIVE') points = 20;
      else points = 5; // fallback
    }
    
    return {
      type: type as 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE',
      text,
      options,
      answer,
      verseRef,
      points,
      keywords
    };
    
  } catch {
    return null;
  }
}

// Only used when Ollama service is completely down
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        points: 10
      });
    } else if (questionType === 'MULTIPLE_CHOICE') {
      fallbackQuestions.push({
        type: 'MULTIPLE_CHOICE',
        text: `What is discussed in ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}?`,
        options: ['Biblical truth', 'Historical events', 'Scientific facts', 'Political matters'],
        answer: 'Biblical truth',
        verseRef,
        points: 10
      });
    } else {
      fallbackQuestions.push({
        type: 'DESCRIPTIVE',
        text: `Describe the main theme of ${book} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}.`,
        answer: 'This passage contains important biblical content that requires careful study and reflection.',
        verseRef,
        points: 10,
        keywords: ['biblical', 'theme', 'study']
      });
    }
  }
  
  return fallbackQuestions;
}