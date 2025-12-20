/* eslint-disable @typescript-eslint/no-explicit-any */

// Enhanced trivia with ChatGPT for critical mistakes, Ollama for the rest

export async function generatePersonalizedTriviaEnhanced(
  memberName: string,
  teamName: string,
  answers: any[],
  quiz: any,
  prisma: any
): Promise<any[]> {
  const triviaItems: any[] = [];

  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalCount = answers.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  const wrongAnswers = answers.filter(a => !a.isCorrect);
  
  console.log(`Generating enhanced trivia for ${memberName}: ${wrongAnswers.length} wrong, ${answers.filter(a => a.isCorrect).length} correct`);
  
  if (wrongAnswers.length > 0) {
    // Sort by importance: descriptive questions are most important
    const sortedWrong = wrongAnswers.sort((a, b) => {
      const typeOrder = { DESCRIPTIVE: 0, FILL_IN_BLANK: 1, MULTIPLE_CHOICE: 2 };
      return typeOrder[a.question.type as keyof typeof typeOrder] - typeOrder[b.question.type as keyof typeof typeOrder];
    });

    for (const [index, wrongAnswer] of sortedWrong.entries()) {
      let insight;
      
      // Use ChatGPT for first 2-3 most important mistakes (usually descriptive)
      // Use Ollama for the rest to save costs
      if (index < 2 && shouldUseChatGPT(wrongAnswer.question.type)) {
        console.log(`    💎 Using ChatGPT for critical mistake: "${wrongAnswer.question.text.substring(0, 50)}..."`);
        insight = await generateWithChatGPT(wrongAnswer, quiz, memberName);
      } else {
        console.log(`    🦙 Using Ollama for mistake: "${wrongAnswer.question.text.substring(0, 50)}..."`);
        insight = await generateWithOllama(wrongAnswer, quiz, memberName);
      }
      
      if (insight) {
        triviaItems.push(insight);
      }
    }
  }

  // Rest of the function remains the same...
  const correctAnswers = answers.filter(a => a.isCorrect);
  if (correctAnswers.length > 0) {
    const selectedCorrect = correctAnswers.slice(0, Math.min(3, correctAnswers.length));
    
    for (const correctAnswer of selectedCorrect) {
      const reinforcement = await generateWithOllama(correctAnswer, quiz, memberName, true);
      if (reinforcement) {
        triviaItems.push(reinforcement);
      }
    }
  }

  // Add summary and other questions...
  // (Keep the rest of your existing code)

  return triviaItems;
}

function shouldUseChatGPT(questionType: string): boolean {
  // Use ChatGPT for descriptive questions (most complex)
  // Use Ollama for simpler question types
  return questionType === 'DESCRIPTIVE';
}

async function generateWithChatGPT(
  wrongAnswer: any,
  quiz: any,
  memberName: string,
  isCorrect = false
): Promise<any | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('⚠️ ChatGPT not configured, falling back to Ollama');
    return generateWithOllama(wrongAnswer, quiz, memberName, isCorrect);
  }

  try {
    const question = wrongAnswer.question;

    const systemPrompt = isCorrect 
      ? 'You are a warm Bible teacher celebrating correct answers and deepening understanding.'
      : 'You are a compassionate Bible teacher helping students learn from specific mistakes with detailed, verse-focused explanations.';

    const userPrompt = isCorrect
      ? buildReinforcementPrompt(wrongAnswer, quiz, memberName)
      : buildLearningPrompt(wrongAnswer, quiz, memberName);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // More creative for educational content
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`ChatGPT API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    return parseAIResponse(text, wrongAnswer, quiz, isCorrect);

  } catch (error: any) {
    console.error('ChatGPT trivia error, falling back to Ollama:', error.message);
    return generateWithOllama(wrongAnswer, quiz, memberName, isCorrect);
  }
}

async function generateWithOllama(
  answer: any,
  quiz: any,
  memberName: string,
  isCorrect = false
): Promise<any | null> {
  try {
    const question = answer.question;
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const prompt = isCorrect
      ? buildReinforcementPrompt(answer, quiz, memberName)
      : buildLearningPrompt(answer, quiz, memberName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: prompt,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    return parseAIResponse(text, answer, quiz, isCorrect);

  } catch (error: any) {
    console.error('Ollama trivia error:', error.message);
    return null;
  }
}

function buildLearningPrompt(wrongAnswer: any, quiz: any, memberName: string): string {
  const question = wrongAnswer.question;
  
  return `
You are helping ${memberName} learn from a specific Bible quiz mistake.

CONTEXT:
Passage: ${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}
Question: ${question.text}
Their Wrong Answer: "${wrongAnswer.response}"
Correct Answer: "${question.answer}"
Verse: ${question.verseRef}

Create a focused, educational explanation (250-350 words):
1. Quote the exact verse ${question.verseRef}
2. Explain why their answer was wrong
3. Explain the correct answer in context
4. Give a memory hook specific to this verse

RESPONSE FORMAT (JSON only):
{
  "title": "Understanding ${question.verseRef}",
  "explanation": "Full explanation here",
  "quickTip": "Memory hook"
}

Generate JSON:
`.trim();
}

function buildReinforcementPrompt(correctAnswer: any, quiz: any, memberName: string): string {
  const question = correctAnswer.question;
  
  return `
Celebrate ${memberName}'s correct answer and deepen understanding.

Question: ${question.text}
Their Correct Answer: "${question.answer}"
Verse: ${question.verseRef}

Write 120-180 words that:
1. Celebrate they got it right
2. Explain why it matters biblically
3. Add deeper context they might not know

RESPONSE FORMAT (JSON only):
{
  "title": "Great Job on ${question.verseRef}",
  "content": "Full content here"
}

Generate JSON:
`.trim();
}

function parseAIResponse(text: string, answer: any, quiz: any, isCorrect: boolean): any | null {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const jsonText = text.slice(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonText);

    if (!parsed.title) {
      return null;
    }

    const question = answer.question;

    if (isCorrect) {
      return {
        type: 'ENCOURAGEMENT',
        title: parsed.title,
        content: `**✅ You answered:** ${question.answer} ✓\n**📖 Reference:** ${question.verseRef}\n\n---\n\n${parsed.content || parsed.explanation}`,
        insight: null,
        studyTips: null,
        suggestedReading: `${quiz.book.name} ${question.verseRef}`
      };
    } else {
      return {
        type: 'COMMON_MISTAKE',
        title: parsed.title,
        content: `**❌ You answered:** ${answer.response}\n**✅ Correct answer:** ${question.answer}\n**📖 Reference:** ${question.verseRef}\n\n---\n\n${parsed.explanation}\n\n---\n\n**💡 Memory Hook:** ${parsed.quickTip}`,
        questionId: question.id,
        insight: null,
        studyTips: null,
        suggestedReading: `${quiz.book.name} ${question.verseRef}`
      };
    }

  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
}
