/* eslint-disable @typescript-eslint/no-explicit-any */
// filepath: c:\Users\Jestin lssac James\OneDrive\Documents\Github\camp-quiz-learner\lib\ollamaQuestions.ts
export type GeneratedQuestion = {
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string[];
  answer: string;
  verseRef: string;
  points: number;
  keywords?: string[]; // For descriptive questions - key concepts that must be present
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
ADVANCED BIBLE QUIZ GENERATOR - CHALLENGING BUT SCRIPTURALLY ACCURATE QUESTIONS

Version: ${version}
Book: ${book}
Range: Chapter ${fromChapter}:${fromVerse} to Chapter ${toChapter}:${toVerse}

PASSAGE TEXT:
${passage}

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. ALL QUESTIONS MUST BE 100% SCRIPTURALLY ACCURATE
2. ALL ANSWERS MUST BE DIRECTLY FROM OR SUPPORTED BY THE PROVIDED PASSAGE
3. NO EXTERNAL THEOLOGICAL CONCEPTS NOT PRESENT IN THIS SPECIFIC TEXT
4. NO SPECULATION OR INTERPRETATION NOT CLEARLY SUPPORTED BY THE PASSAGE
5. CHALLENGE COMES FROM DEPTH OF UNDERSTANDING THE ACTUAL TEXT, NOT EXTERNAL KNOWLEDGE

Generate EXACTLY 10 CHALLENGING ${questionType} questions that require DEEP understanding of THIS SPECIFIC PASSAGE but remain completely faithful to the biblical text.

DIFFICULTY STRATEGY:
- Focus on CONNECTIONS between verses within the passage
- Examine WORD CHOICES and their significance in context
- Analyze LITERARY STRUCTURE present in the passage
- Explore IMPLICATIONS clearly derivable from the text
- Look for CONTRASTS and PARALLELS within the passage
- Examine CAUSE-AND-EFFECT relationships shown in the text

${questionType === 'FILL_IN_BLANK' ? `
FILL_IN_BLANK STRATEGY - SCRIPTURE-BASED:
- Use actual WORDS from the passage, not external theological terms
- Focus on KEY TERMS that connect multiple verses in the passage
- Highlight IMPORTANT CONCEPTS explicitly mentioned in the text
- Use words that show RELATIONSHIPS between ideas in the passage

EXAMPLES OF SCRIPTURE-ACCURATE FILL_IN_BLANK:
- "The word _____ in verse X connects to the concept mentioned in verse Y, showing the author's emphasis on..."
- "When the text says _____, it builds upon the foundation laid in the previous verse about..."
- "The repetition of _____ throughout verses X-Y demonstrates the central theme of this passage"

Format:
[
  {
    "type": "FILL_IN_BLANK",
    "text": "Question based on actual words/concepts in the passage with _____ requiring understanding of textual connections",
    "answer": "word_actually_in_passage",
    "verseRef": "1:1",
    "points": 15
  }
]` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
MULTIPLE_CHOICE STRATEGY - SCRIPTURE-BASED:
- All options must relate to concepts ACTUALLY PRESENT in the passage
- Focus on TEXTUAL ANALYSIS of what is written
- Create sophisticated distractors using RELATED but incorrect textual analysis

EXAMPLES OF SCRIPTURE-ACCURATE MULTIPLE_CHOICE:
- Questions about the STRUCTURE or FLOW of the argument in the passage
- Questions about RELATIONSHIPS between different parts of the text
- Questions about the MEANING of specific phrases in their context
- Questions about HOW the author develops ideas throughout the passage

Format:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "What does this passage demonstrate about [concept actually present in the text]?",
    "options": [
      "Option based on one aspect of the actual text",
      "Option based on different aspect of the actual text", 
      "Option that sounds plausible but misreads the text",
      "Option that partially correct but incomplete based on the text"
    ],
    "answer": "Option based on one aspect of the actual text",
    "verseRef": "1:3-5",
    "points": 15
  }
]` : ''}

${questionType === 'DESCRIPTIVE' ? `
DESCRIPTIVE STRATEGY - SCRIPTURE-BASED:
- Require COMPREHENSIVE analysis of what the passage ACTUALLY TEACHES
- Ask for explanation of CONNECTIONS within the passage itself
- Require analysis of LITERARY DEVICES actually present in the text
- Ask about PROGRESSION of thought shown in the passage
- Focus on THEMES that emerge from careful reading of this text

EXAMPLES OF SCRIPTURE-ACCURATE DESCRIPTIVE:
- "Analyze the progression of thought from verse X to verse Y and explain how each step builds upon the previous one"
- "Examine the literary structure of this passage and explain how the author uses repetition/contrast/progression to convey the main message"
- "Discuss how the specific word choices in this passage contribute to the overall argument being presented"

Format:
[
  {
    "type": "DESCRIPTIVE",
    "text": "Complex analytical question requiring deep understanding of THIS SPECIFIC PASSAGE and its internal structure/themes/arguments",
    "answer": "Comprehensive answer based entirely on careful analysis of the provided text, with specific verse references and textual evidence",
    "verseRef": "1:1-10",
    "points": 20,
    "keywords": ["textual_concept_1", "textual_concept_2", "structural_element", "thematic_connection", "contextual_meaning"]
  }
]` : ''}

ABSOLUTE REQUIREMENTS:
1. Every question must be answerable from the provided passage ONLY
2. No external theological knowledge required beyond what's in the text
3. All answers must be verifiable by reading the passage carefully
4. Use actual words and phrases from the passage whenever possible
5. Questions test UNDERSTANDING of the text, not external theological education
6. Challenge comes from careful analysis of what IS written, not speculation about what isn't
7. For descriptive questions, keywords must be concepts actually present in the passage
8. All verse references must point to actual verses in the provided range

SCRIPTURE ACCURACY CHECK:
- Before finalizing each question, verify the answer can be found in the passage
- Ensure no external theological concepts are introduced
- Confirm all multiple choice options relate to the actual text
- Verify all fill-in-blanks use words that actually appear in or directly relate to the passage

Generate 10 CHALLENGING but SCRIPTURALLY ACCURATE questions now:
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API failed: ${response.status}`);
    }

    const data = await response.json();
    let text = data.response ?? '';
    
    console.log('Raw Ollama response:', text);

    // Clean up the response - remove any text before/after JSON
    text = text.trim();
    
    // Find JSON array boundaries
    const startIndex = text.indexOf('[');
    const lastIndex = text.lastIndexOf(']');
    
    if (startIndex === -1 || lastIndex === -1) {
      throw new Error('No JSON array found in response');
    }
    
    const jsonText = text.slice(startIndex, lastIndex + 1);
    console.log('Extracted JSON:', jsonText);
    
    // Parse the JSON
    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Problematic JSON:', jsonText);
      
      // Try to fix common JSON issues
      const fixedJson = jsonText
        .replace(/\n/g, ' ')                    
        .replace(/\t/g, ' ')                    
        .replace(/\s+/g, ' ')                  
        .replace(/,\s*}/g, '}')                
        .replace(/,\s*]/g, ']')                
        .replace(/([^"]),(\s*[^"\s])/g, '$1,"$2') 
        .replace(/\\"/g, '\\"')
        .replace(/[\u201C\u201D]/g, '"')        // Fix smart quotes
        .replace(/[\u2018\u2019]/g, "'");       // Fix smart apostrophes
      
      try {
        questions = JSON.parse(fixedJson);
        console.log('JSON fixed and parsed successfully');
      } catch (secondError: any) {
        throw new Error(`JSON parsing failed even after fixes: ${secondError.message}\nOriginal JSON: ${jsonText.substring(0, 200)}...`);
      }
    }

    // Validate the response
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    if (questions.length === 0) {
      throw new Error('No questions generated');
    }

    // Enhanced validation with scripture accuracy check
    const validatedQuestions: GeneratedQuestion[] = [];
    for (let i = 0; i < questions.length && i < 10; i++) {
      const q = questions[i];
      
      // Ensure all required fields exist
      if (!q.type || !q.text || !q.answer) {
        console.warn(`Question ${i + 1} missing required fields:`, q);
        continue;
      }

      // Validate question type
      if (!['FILL_IN_BLANK', 'MULTIPLE_CHOICE', 'DESCRIPTIVE'].includes(q.type)) {
        console.warn(`Question ${i + 1} has invalid type:`, q.type);
        continue;
      }

      // Check question complexity (must be at least 50 characters)
      if (q.text.length < 50) {
        console.warn(`Question ${i + 1} too simple:`, q.text);
        continue;
      }

      // SCRIPTURE ACCURACY CHECK: Verify verse reference is valid
      const verseRef = q.verseRef || `${fromChapter}:${fromVerse}`;
      if (!isValidVerseReference(verseRef, fromChapter, fromVerse, toChapter, toVerse)) {
        console.warn(`Question ${i + 1} has invalid verse reference:`, verseRef);
        // Set to a default valid reference
        q.verseRef = `${fromChapter}:${fromVerse}`;
      }

      // For multiple choice, ensure options exist and are substantial
      if (q.type === 'MULTIPLE_CHOICE') {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 4) {
          console.warn(`Question ${i + 1} multiple choice missing options:`, q);
          continue;
        }
        
        // Check that all options are substantial (not just single words)
        const substantialOptions = q.options.filter(opt => opt.length > 10);
        if (substantialOptions.length < 4) {
          console.warn(`Question ${i + 1} has overly simple options:`, q.options);
          continue;
        }
      }

      // For descriptive questions, ensure comprehensive answers and keywords
      if (q.type === 'DESCRIPTIVE') {
        if (q.answer.length < 100) {
          console.warn(`Question ${i + 1} descriptive answer too short:`, q.answer);
          continue;
        }
        
        // Ensure keywords exist and are scripture-based
        if (!q.keywords || !Array.isArray(q.keywords) || q.keywords.length < 3) {
          // Generate keywords based on actual passage content
          q.keywords = extractScriptureKeywords(q.text, q.answer, passage);
        }
      }

      validatedQuestions.push({
        type: q.type,
        text: q.text.trim(),
        options: q.options || undefined,
        answer: q.answer.trim(),
        verseRef: q.verseRef || `${fromChapter}:${fromVerse}`,
        points: getQuestionPoints(q.type),
        keywords: q.keywords || undefined
      });
    }

    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions could be parsed from response');
    }

    console.log(`Successfully generated ${validatedQuestions.length} challenging but scripture-accurate questions`);
    return validatedQuestions;

  } catch (error: any) {
    console.error('generate10Questions error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

// Helper function to validate verse references
function isValidVerseReference(
  verseRef: string, 
  fromChapter: number, 
  fromVerse: number, 
  toChapter: number, 
  toVerse: number
): boolean {
  const match = verseRef.match(/(\d+):(\d+)/);
  if (!match) return false;
  
  const chapter = parseInt(match[1]);
  const verse = parseInt(match[2]);
  
  return chapter >= fromChapter && chapter <= toChapter && verse >= 1;
}

// Helper function to determine points based on question type
function getQuestionPoints(type: string): number {
  switch (type) {
    case 'FILL_IN_BLANK': return 15;
    case 'MULTIPLE_CHOICE': return 15;
    case 'DESCRIPTIVE': return 20;
    default: return 10;
  }
}

// Helper function to extract keywords based on actual passage content
function extractScriptureKeywords(questionText: string, answerText: string, passage: string): string[] {
  const combinedText = `${questionText} ${answerText} ${passage}`.toLowerCase();
  
  // Extract meaningful words from the passage itself (excluding common words)
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'that', 'this', 'these', 'those', 'he', 'she', 'it', 'they', 'we', 'you', 'i', 'me', 'my', 'your', 'his', 'her', 'their', 'our'];
  
  const words = passage.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .filter(word => combinedText.includes(word));
  
  // Get unique words and take the most relevant ones
  const uniqueWords = [...new Set(words)];
  
  // If we have good words from the passage, use them; otherwise use generic terms
  return uniqueWords.length >= 3 ? uniqueWords.slice(0, 6) : 
    ['textual_analysis', 'contextual_meaning', 'scriptural_connection'];
}
