/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/ollamaQuestions.ts
export type GeneratedQuestion = {
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string[];
  answer: string;
  verseRef: string;
  points: number;
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
BIBLE QUIZ QUESTION GENERATOR

Version: ${version}
Book: ${book}
Range: Chapter ${fromChapter}:${fromVerse} to Chapter ${toChapter}:${toVerse}

PASSAGE TEXT:
${passage}

Generate EXACTLY 10 questions of type: ${questionType}

IMPORTANT RULES:
1. Output ONLY valid JSON array, no explanations
2. Use exact format below
3. For DESCRIPTIVE questions, keep answers under 200 characters
4. For MULTIPLE_CHOICE, provide exactly 4 options
5. Include verse reference like "1:1" or "2:3-5"

${questionType === 'FILL_IN_BLANK' ? `
Format for FILL_IN_BLANK:
[
  {
    "type": "FILL_IN_BLANK",
    "text": "In the _____ God created the heavens and earth",
    "answer": "beginning",
    "verseRef": "1:1",
    "points": 10
  }
]` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
Format for MULTIPLE_CHOICE:
[
  {
    "type": "MULTIPLE_CHOICE", 
    "text": "What did God create first?",
    "options": ["Light", "Darkness", "Water", "Earth"],
    "answer": "Light",
    "verseRef": "1:3",
    "points": 10
  }
]` : ''}

${questionType === 'DESCRIPTIVE' ? `
Format for DESCRIPTIVE:
[
  {
    "type": "DESCRIPTIVE",
    "text": "Describe God's creation process in Genesis 1:1-3",
    "answer": "God spoke and created everything from nothing through His word",
    "verseRef": "1:1-3", 
    "points": 10
  }
]` : ''}

Generate 10 questions now:
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
        .replace(/\n/g, ' ')                    // Remove newlines
        .replace(/\t/g, ' ')                    // Remove tabs
        .replace(/\s+/g, ' ')                   // Normalize spaces
        .replace(/,\s*}/g, '}')                 // Remove trailing commas
        .replace(/,\s*]/g, ']')                 // Remove trailing commas in arrays
        .replace(/([^"]),(\s*[^"\s])/g, '$1,"$2') // Add missing quotes
        .replace(/\\"/g, '\\"');                // Fix escaped quotes
      
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

    // Validate each question
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

      // For multiple choice, ensure options exist
      if (q.type === 'MULTIPLE_CHOICE' && (!q.options || !Array.isArray(q.options) || q.options.length < 4)) {
        console.warn(`Question ${i + 1} multiple choice missing options:`, q);
        continue;
      }

      validatedQuestions.push({
        type: q.type,
        text: q.text.trim(),
        options: q.options || undefined,
        answer: q.answer.trim(),
        verseRef: q.verseRef || `${fromChapter}:${fromVerse}`,
        points: q.points || 10
      });
    }

    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions could be parsed from response');
    }

    console.log(`Successfully generated ${validatedQuestions.length} valid questions`);
    return validatedQuestions;

  } catch (error: any) {
    console.error('generate10Questions error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}
