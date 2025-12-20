/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generatePersonalizedTrivia(
  memberName: string,
  teamName: string,
  answers: any[],
  quiz: any,
  prisma: any
): Promise<any[]> {
  const triviaItems: any[] = [];

  // Calculate performance metrics
  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalCount = answers.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  // 1. PRIORITY: Generate deep learning insights for WRONG answers first
  const wrongAnswers = answers.filter(a => !a.isCorrect);
  
  console.log(`Generating trivia for ${memberName}: ${wrongAnswers.length} wrong, ${answers.filter(a => a.isCorrect).length} correct`);
  
  if (wrongAnswers.length > 0) {
    for (const wrongAnswer of wrongAnswers) {
      const insight = await generateDeepLearningInsight(
        wrongAnswer,
        quiz,
        memberName
      );
      
      if (insight) {
        triviaItems.push(insight);
      }
    }
  }

  // 2. Generate reinforcement for CORRECT answers (celebrate and deepen understanding)
  const correctAnswers = answers.filter(a => a.isCorrect);
  if (correctAnswers.length > 0) {
    // Pick 2-3 interesting correct answers to reinforce
    const selectedCorrect = correctAnswers.slice(0, Math.min(3, correctAnswers.length));
    
    for (const correctAnswer of selectedCorrect) {
      const reinforcement = await generateReinforcementInsight(
        correctAnswer,
        quiz,
        memberName
      );
      
      if (reinforcement) {
        triviaItems.push(reinforcement);
      }
    }
  }

  // 3. Performance Summary at the END (so mistakes come first)
  const summaryTrivia = {
    type: 'INSIGHT',
    title: `📊 Quiz Summary - ${quiz.title}`,
    content: buildEncouragingSummary(memberName, correctCount, totalCount, percentage, answers),
    insight: null, // Remove redundant insight
    studyTips: null, // Remove redundant study tips
    suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
  };

  triviaItems.push(summaryTrivia);

  // 4. Additional study questions from other members (at the very end)
  const otherQuestions = await getOtherMembersQuestions(quiz.id, answers.map(a => a.questionId), prisma);
  
  if (otherQuestions.length > 0) {
    const otherQuestionsTrivia = {
      type: 'STUDY_TIP',
      title: `📚 Practice More Questions`,
      content: buildOtherQuestionsContent(otherQuestions),
      insight: null,
      studyTips: null,
      suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
    };

    triviaItems.push(otherQuestionsTrivia);
  }

  return triviaItems;
}

// CORE FUNCTION: Generate deep learning insights for wrong answers
async function generateDeepLearningInsight(
  wrongAnswer: any,
  quiz: any,
  memberName: string
): Promise<any | null> {
  // Try ChatGPT first, fallback to Ollama
  const chatGPTResult = await generateWithChatGPT(wrongAnswer, quiz, memberName, 'wrong');
  if (chatGPTResult) {
    return chatGPTResult;
  }
  
  console.log('    ⚠️ ChatGPT failed, falling back to Ollama');
  return generateWithOllama(wrongAnswer, quiz, memberName, 'wrong');
}

// ChatGPT API call for trivia
async function generateWithChatGPT(
  answer: any,
  quiz: any,
  memberName: string,
  type: 'wrong' | 'correct'
): Promise<any | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }

  try {
    const question = answer.question;
    
    console.log(`    💎 Calling ChatGPT for: "${question.text.substring(0, 50)}..."`);

    const prompt = type === 'wrong' 
      ? buildWrongAnswerPrompt(answer, quiz, memberName)
      : buildCorrectAnswerPrompt(answer, quiz, memberName);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a warm, encouraging Bible study companion who makes learning personal and engaging. Write in a conversational, friendly tone as if speaking directly to the student. Use "you" and "your" naturally. Be enthusiastic but genuine.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // More creative and conversational
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      console.error(`    ❌ ChatGPT API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      return null;
    }

    console.log(`    ✅ ChatGPT response: ${text.length} chars`);

    return parseAIResponse(text, answer, quiz, type);

  } catch (error: any) {
    console.error('    ❌ ChatGPT error:', error.message);
    return null;
  }
}

// Ollama fallback
async function generateWithOllama(
  answer: any,
  quiz: any,
  memberName: string,
  type: 'wrong' | 'correct'
): Promise<any | null> {
  try {
    const question = answer.question;

    console.log(`    🦙 Calling Ollama for: "${question.text.substring(0, 50)}..."`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const prompt = type === 'wrong'
      ? buildWrongAnswerPrompt(answer, quiz, memberName)
      : buildCorrectAnswerPrompt(answer, quiz, memberName);

    const response = await fetch('http://localhost:11434/api/generate', {
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
      console.error(`    ❌ Ollama API error: ${response.status}`);
      return createFallbackLearningInsight(answer, quiz);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    console.log(`    ✅ Ollama response: ${text.length} chars`);

    return parseAIResponse(text, answer, quiz, type);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('    ❌ Ollama timeout after 30s');
    } else {
      console.error('    ❌ Ollama error:', error.message);
    }
    return createFallbackLearningInsight(answer, quiz);
  }
}

// Build conversational prompt for wrong answers
function buildWrongAnswerPrompt(wrongAnswer: any, quiz: any, memberName: string): string {
  const question = wrongAnswer.question;
  const questionType = question.type;

  return `
Hey! You're helping ${memberName} learn from a quiz mistake in a super engaging, conversational way.

CONTEXT:
Bible Passage: ${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}
Question Type: ${questionType}
The Question: ${question.text}
What ${memberName} Answered: "${wrongAnswer.response}"
The Correct Answer: "${question.answer}"
${question.options ? `All the Options Were: ${JSON.parse(question.options).join(', ')}` : ''}
Specific Verse: ${question.verseRef}

YOUR MISSION:
Write this like you're having a friendly conversation with ${memberName}. Use "you" and "your" naturally. Be warm, encouraging, and make them WANT to learn this.

TONE: Conversational, warm, enthusiastic (but not cheesy). Like a cool youth pastor or favorite teacher.

STRUCTURE YOUR RESPONSE (250-350 words):

1. **Opening Hook** (conversational starter)
   - Start with something engaging like "Hey ${memberName}, let's talk about this one..." or "Okay, so here's what happened with this question..."
   - Make them feel it's okay they got it wrong

2. **The Verse in Context** 
   - Quote ${question.verseRef} directly
   - Explain what Paul/the author is actually saying in THIS specific verse
   - Make it come alive - what's happening here?

3. **Why You Picked That Answer**
   - Validate their thinking: "I can totally see why you chose '${wrongAnswer.response}'..."
   - Explain what made it seem right
   - Show you understand their thought process

4. **The Real Answer** 
   - Explain why "${question.answer}" is actually the correct choice
   - Connect it to the exact wording in ${question.verseRef}
   - Make it click for them

5. **The Biblical Point**
   - What's the theological or narrative significance here?
   - Why does this detail matter in the bigger picture?
   - What was Paul trying to communicate?

6. **Memory Hook**
   - Give them something SPECIFIC and memorable about ${question.verseRef}
   - Make it stick - a phrase, connection, or detail they won't forget

WRITING STYLE:
✓ Use "you" and "your" - talk TO them
✓ Short sentences mixed with longer ones - keep it natural
✓ Be enthusiastic but genuine
✓ Use transitions like "Here's the thing...", "So check this out...", "Now here's what's interesting..."
✓ Make scripture come alive, not boring

${questionType === 'FILL_IN_BLANK' ? `
FILL IN THE BLANK TIPS:
- Show them the complete sentence with the answer filled in
- Explain why THIS specific word fits perfectly (grammar + meaning)
- Point to where this exact word appears in ${question.verseRef}
` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
MULTIPLE CHOICE TIPS:
- Walk through why EACH wrong option doesn't work
- Show the EXACT phrase in ${question.verseRef} that proves the right answer
- Make them see the one-word differences that matter
` : ''}

${questionType === 'DESCRIPTIVE' ? `
DESCRIPTIVE TIPS:
- Break down ${question.verseRef} piece by piece
- Show which specific concepts they missed
- Help them see the connections between ideas
` : ''}

RESPONSE FORMAT (JSON only, no markdown code blocks):
{
  "title": "Let's Talk About ${question.verseRef}",
  "explanation": "Your full conversational explanation here (250-350 words, written directly to ${memberName})",
  "quickTip": "A memorable hook for ${question.verseRef} - make it stick!"
}

Write this like you're texting a friend who wants to actually understand this. Make it engaging and real!

Generate JSON now:
`.trim();
}

// Build conversational prompt for correct answers  
function buildCorrectAnswerPrompt(correctAnswer: any, quiz: any, memberName: string): string {
  const question = correctAnswer.question;

  return `
You're celebrating ${memberName}'s correct answer and making them feel smart while teaching something deeper!

CONTEXT:
The Question: ${question.text}
What ${memberName} Correctly Answered: "${question.answer}"
${question.options ? `The Wrong Options Were: ${JSON.parse(question.options).filter((o: string) => o !== question.answer).join(', ')}` : ''}
The Verse: ${question.verseRef}

YOUR MISSION:
Write 150-200 words that feels like a high-five followed by "and here's why that's even cooler than you thought..."

TONE: Celebratory, warm, genuinely impressed. Make them feel accomplished.

STRUCTURE:

1. **Celebrate First** (20-30 words)
   - Enthusiastic affirmation: "Yes! You nailed this one!" or "Nice work on this, ${memberName}!"
   - Make them feel good about getting it right

2. **Why It Matters** (60-80 words)
   - Explain the biblical significance of what they got right
   - What makes this detail important in ${question.verseRef}?
   - Connect it to the bigger message

3. **The Tricky Part** (40-50 words)
   - Show why the wrong answers were tempting
   - "A lot of people would've picked [wrong answer] because..."
   - Make them feel smart for catching the difference

4. **Go Deeper** (30-40 words)
   - Add one cool insight they might not know
   - Connection to other verses, cultural context, or deeper meaning
   - Leave them wanting to learn more

WRITING STYLE:
✓ Enthusiastic but genuine - no fake hype
✓ Use "you" and "your" naturally
✓ Make them feel smart
✓ Teach something new they didn't expect

RESPONSE FORMAT (JSON only):
{
  "title": "You Got It! ${question.verseRef}",
  "content": "Your full celebration + teaching content (150-200 words)"
}

Make them excited they got it right AND teach them something new!

Generate JSON now:
`.trim();
}

// Parse AI response into trivia format
function parseAIResponse(
  text: string,
  answer: any,
  quiz: any,
  type: 'wrong' | 'correct'
): any | null {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('    ❌ No valid JSON in response');
      return null;
    }

    const jsonText = text.slice(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonText);

    if (type === 'wrong' && (!parsed.title || !parsed.explanation)) {
      console.error('    ❌ Missing required fields for wrong answer');
      return null;
    }

    if (type === 'correct' && (!parsed.title || !parsed.content)) {
      console.error('    ❌ Missing required fields for correct answer');
      return null;
    }

    const question = answer.question;

    if (type === 'wrong') {
      const content = `
**❌ You answered:** ${answer.response}  
**✅ Correct answer:** ${question.answer}  
**📖 Reference:** ${question.verseRef}

---

${parsed.explanation}

---

**💡 Remember This:** ${parsed.quickTip}
      `.trim();

      return {
        type: 'COMMON_MISTAKE',
        title: parsed.title,
        content: content,
        questionId: question.id,
        insight: null,
        studyTips: null,
        suggestedReading: `${quiz.book.name} ${question.verseRef}`
      };
    } else {
      const content = `
**✅ You answered:** ${question.answer} ✓  
**📖 Reference:** ${question.verseRef}

---

${parsed.content}
      `.trim();

      return {
        type: 'ENCOURAGEMENT',
        title: parsed.title,
        content: content,
        insight: null,
        studyTips: null,
        suggestedReading: `${quiz.book.name} ${question.verseRef}`
      };
    }

  } catch (error) {
    console.error('    ❌ Error parsing AI response:', error);
    return null;
  }
}

// CORE FUNCTION: Generate reinforcement for correct answers
async function generateReinforcementInsight(
  correctAnswer: any,
  quiz: any,
  memberName: string
): Promise<any | null> {
  // Try ChatGPT first, fallback to Ollama
  const chatGPTResult = await generateWithChatGPT(correctAnswer, quiz, memberName, 'correct');
  if (chatGPTResult) {
    return chatGPTResult;
  }
  
  console.log('    ⚠️ ChatGPT failed for reinforcement, falling back to Ollama');
  return generateWithOllama(correctAnswer, quiz, memberName, 'correct');
}

// Fallback for when AI generation fails
function createFallbackLearningInsight(
  wrongAnswer: any,
  quiz: any
): any {
  const question = wrongAnswer.question;

  const content = `
**❌ You answered:** ${wrongAnswer.response}  
**✅ Correct answer:** ${question.answer}  
**📖 Reference:** ${question.verseRef}

---

You got this question wrong, but that's okay - mistakes are how we learn!

The correct answer is **"${question.answer}"** from ${question.verseRef}. 

**Why this matters:** Take time to read this verse carefully in context. Pay special attention to:
- The exact words and phrases used
- Who is speaking and who is being addressed
- The theological or narrative significance
- How this fits into the broader passage

**For camp quiz:** Read ${question.verseRef} several times and make sure you understand not just what it says, but why those specific words are used. Precision in biblical knowledge matters!

---

**💡 Quick Tip:** Review this passage again before camp quiz and focus on the specific details.
  `.trim();

  return {
    type: 'COMMON_MISTAKE',
    title: `Review: ${question.text.substring(0, 60)}...`,
    content: content,
    insight: null,
    studyTips: null,
    suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
  };
}

// Build encouraging summary
function buildEncouragingSummary(
  memberName: string,
  correctCount: number,
  totalCount: number,
  percentage: number,
  answers: any[]
): string {
  let content = `Hey ${memberName}! Let's look at how you did:\n\n`;

  content += `**📊 Your Score: ${correctCount} out of ${totalCount} (${percentage}%)**\n\n`;

  // Contextual encouragement - more conversational
  if (percentage >= 90) {
    content += `🌟 **Wow, amazing work!** You really know this passage! You're more than ready for camp quiz. Seriously impressive.\n\n`;
  } else if (percentage >= 75) {
    content += `🎯 **Nice job!** You've got a solid grasp of this passage. Just review the mistakes above and you'll be golden for camp quiz.\n\n`;
  } else if (percentage >= 60) {
    content += `👍 **Good effort!** You're getting there. Take a close look at the explanations above for the ones you missed - they'll help it click.\n\n`;
  } else if (percentage >= 40) {
    content += `💪 **Keep at it!** This passage needs some more attention, but that's totally okay. Read through all the feedback above - it's there to help you learn.\n\n`;
  } else {
    content += `📚 **Alright, let's be real** - this passage needs more study time. But hey, that's what this quiz is for! Read through all the explanations above carefully, then go back and read the actual scripture passage. You've got this!\n\n`;
  }

  // Performance breakdown by type - more conversational
  const fillInBlank = answers.filter(a => a.question.type === 'FILL_IN_BLANK');
  const multipleChoice = answers.filter(a => a.question.type === 'MULTIPLE_CHOICE');
  const descriptive = answers.filter(a => a.question.type === 'DESCRIPTIVE');

  if (fillInBlank.length > 0 || multipleChoice.length > 0 || descriptive.length > 0) {
    content += `**📈 Here's how you did by question type:**\n\n`;

    if (fillInBlank.length > 0) {
      const fibCorrect = fillInBlank.filter(a => a.isCorrect).length;
      const fibPercent = Math.round((fibCorrect / fillInBlank.length) * 100);
      const fibEmoji = fibPercent >= 70 ? '✓' : '○';
      content += `${fibEmoji} Fill in the Blank: ${fibCorrect}/${fillInBlank.length} (${fibPercent}%)\n`;
    }

    if (multipleChoice.length > 0) {
      const mcCorrect = multipleChoice.filter(a => a.isCorrect).length;
      const mcPercent = Math.round((mcCorrect / multipleChoice.length) * 100);
      const mcEmoji = mcPercent >= 70 ? '✓' : '○';
      content += `${mcEmoji} Multiple Choice: ${mcCorrect}/${multipleChoice.length} (${mcPercent}%)\n`;
    }

    if (descriptive.length > 0) {
      const descCorrect = descriptive.filter(a => a.isCorrect).length;
      const descPercent = Math.round((descCorrect / descriptive.length) * 100);
      const descEmoji = descPercent >= 70 ? '✓' : '○';
      content += `${descEmoji} Descriptive: ${descCorrect}/${descriptive.length} (${descPercent}%)\n`;
    }

    content += `\n`;
  }

  // Specific weak areas - more helpful tone
  const weakQuestions = answers.filter(a => !a.isCorrect);
  if (weakQuestions.length > 0 && weakQuestions.length <= 5) {
    content += `**🎯 Before camp quiz, definitely review these verses:**\n\n`;
    weakQuestions.forEach((q, idx) => {
      content += `${idx + 1}. ${q.question.verseRef} - "${q.question.text.substring(0, 60)}..."\n`;
    });
    content += `\n`;
  } else if (weakQuestions.length > 5) {
    content += `**🎯 Key areas to focus on:**\n\n`;
    content += `You missed quite a few, so here's what to do: Read through ALL the explanations above (they're detailed for a reason!), then go back and read the whole passage from start to finish. Let it sink in.\n\n`;
  }

  // Next steps - actionable and conversational
  content += `---\n\n`;
  if (percentage < 60) {
    content += `**🔥 What to do next:** Okay, real talk - scroll back up and read every single explanation for the questions you missed. Don't skip them! Then open your Bible and read the entire passage from ${answers[0]?.question?.verseRef || 'the beginning'}. Read it slowly. Let the words connect to what you learned.`;
  } else if (percentage < 80) {
    content += `**🔥 What to do next:** Review each wrong answer above - the explanations will help you understand what you missed. Then give the passage one more read through to see everything in context. You're almost there!`;
  } else {
    content += `**🔥 What to do next:** You're crushing it! Still, take a quick look at the insights above to deepen your understanding even more. The details matter for camp quiz, and you're ready to ace it!`;
  }

  return content;
}

async function getOtherMembersQuestions(quizId: number, myQuestionIds: number[], prisma: any): Promise<any[]> {
  const otherQuestions = await prisma.question.findMany({
    where: {
      quizId: quizId,
      id: {
        notIn: myQuestionIds
      }
    },
    take: 5,
    orderBy: {
      order: 'asc'
    }
  });

  return otherQuestions;
}

function buildOtherQuestionsContent(questions: any[]): string {
  if (questions.length === 0) {
    return `No bonus practice questions yet! As other members complete this quiz, their questions will show up here for extra practice. Check back soon!`;
  }

  let content = `Hey, want some extra practice? Here are questions other members got from the same passage. Test yourself!\n\n`;
  content += `---\n\n`;

  questions.forEach((question, index) => {
    content += `**Question ${index + 1}** ${question.verseRef ? `(${question.verseRef})` : ''}\n\n`;
    content += `${question.text}\n\n`;
    
    if (question.type === 'MULTIPLE_CHOICE' && question.options) {
      try {
        const options = JSON.parse(question.options);
        options.forEach((option: string, optIndex: number) => {
          const letter = String.fromCharCode(65 + optIndex);
          const isCorrect = option === question.answer;
          const marker = isCorrect ? '✅' : '  ';
          content += `${marker} **${letter}.** ${option}\n`;
        });
        content += `\n`;
      } catch {
        content += `**Answer:** ${question.answer}\n\n`;
      }
    } else if (question.type === 'FILL_IN_BLANK') {
      // Show the question with answer revealed
      const fullText = question.text.replace(/_+/g, `**${question.answer}**`);
      content += `**Complete answer:** ${fullText}\n\n`;
    } else {
      content += `**Sample answer:** ${question.answer}\n\n`;
    }
    
    if (index < questions.length - 1) {
      content += `---\n\n`;
    }
  });

  content += `\n**💡 Pro tip:** Cover the answers and try these yourself first. See how you do!`;

  return content;
}