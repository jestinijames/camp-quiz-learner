// lib/ollamaQuestions.ts
export type GeneratedQuestion = {
  type: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  text: string;
  options?: string[];
  answer: string;
  verseRef: string;  // "Ch X:V Y"
  points: number;
};

export async function generate10Questions(
  version: string,
  book: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  passage: string,  // ← ONE LONG STRING "1:1 Paul... 1:2 To the church..."
  questionType: 'FILL_IN_BLANK' | 'MULTIPLE_CHOICE' | 'DESCRIPTIVE'
): Promise<GeneratedQuestion[]> {
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      stream: false,
      prompt: `
BIBLE QUIZ QUESTION GENERATOR - BE 100% ACCURATE TO TEXT ONLY

Version: ${version}
Book: ${book}
Range: Chapter ${fromChapter}:${fromVerse} to Chapter ${toChapter}:${toVerse}

EXACT PASSAGE TEXT (use ONLY this):
${passage}

Generate EXACTLY 10 questions of type: ${questionType}
- FILL_IN_BLANK: Use "_____" for blank. Answer = exact words from text.
- MULTIPLE_CHOICE: 4 options (A,B,C,D), 1 correct. Answer = exact option text.
- DESCRIPTIVE: Short answer. Answer = 1-2 sentences from text.

RULES:
1. Questions MUST come from ONLY this exact passage above
2. Include verse reference IN BRACKETS at end: [${fromChapter}:${fromVerse}] format
3. Do NOT invent/add details not in passage
4. Answers must match Bible text exactly

Output ONLY valid JSON array:

[
  {
    "type": "${questionType}",
    "text": "Question here [1:4]",
    "answer": "exact answer from passage",
    ${questionType === 'MULTIPLE_CHOICE' ? '"options": ["A", "B", "C", "D"],' : ''}
    "verseRef": "1:4",
    "points": 10
  }
]
      `.trim(),
    }),
  });

  if (!response.ok) throw new Error('Ollama failed');

  const data = await response.json();
  const text = data.response ?? '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid JSON from Llama3');

  return JSON.parse(jsonMatch[0]) as GeneratedQuestion[];
}
