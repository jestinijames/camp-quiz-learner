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
  try {
    const question = wrongAnswer.question;
    const questionType = question.type;

    console.log(`    🤖 Calling Ollama for: "${question.text.substring(0, 50)}..."`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are a compassionate Bible study teacher helping ${memberName} learn from THIS SPECIFIC mistake.

CONTEXT:
Bible Passage: ${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}
Question Type: ${questionType}
THIS SPECIFIC QUESTION: ${question.text}
Student's Wrong Answer: "${wrongAnswer.response}"
Correct Answer: "${question.answer}"
${question.options ? `Available Options: ${JSON.parse(question.options).join(', ')}` : ''}
EXACT Verse Reference: ${question.verseRef}

CRITICAL: Your explanation MUST be UNIQUE to THIS question. DO NOT give generic advice.

YOUR TASK:
Create a SPECIFIC educational explanation (250-350 words) that helps ${memberName} understand THIS EXACT MISTAKE:

1. **Quote the Verse**: Start by quoting the EXACT verse ${question.verseRef} that contains the answer
2. **What They Got Wrong**: Explain why "${wrongAnswer.response}" is incorrect FOR THIS SPECIFIC QUESTION
3. **Why It Seemed Right**: Validate their thinking - explain what made "${wrongAnswer.response}" plausible
4. **The Correct Answer in Context**: Explain what "${question.answer}" means IN THIS EXACT VERSE
5. **The Theological Point**: What is Paul specifically teaching in ${question.verseRef}?
6. **Memory Hook**: Give a SPECIFIC mnemonic or detail from THIS verse to remember

TEACHING STYLE:
- QUOTE the actual verse text from ${question.verseRef}
- Reference SPECIFIC words and phrases from ${question.verseRef}
- Explain the EXACT context of ${question.verseRef}
- Make it SPECIFIC to THIS question, not generic Bible advice
- 250-350 words with deep verse-level detail

${questionType === 'FILL_IN_BLANK' ? `
FILL IN THE BLANK SPECIFIC TIPS:
- Quote the FULL sentence with the blank filled in
- Explain why THIS specific word fits the grammar and theology
- Show where in ${question.verseRef} this word appears
` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
MULTIPLE CHOICE SPECIFIC TIPS:
- Explain why EACH wrong option doesn't fit ${question.verseRef}
- Show the SPECIFIC phrase in ${question.verseRef} that proves the right answer
` : ''}

${questionType === 'DESCRIPTIVE' ? `
DESCRIPTIVE SPECIFIC TIPS:
- Break down ${question.verseRef} phrase by phrase
- Show which concepts from ${question.verseRef} they missed
` : ''}

RESPONSE FORMAT (JSON only, no markdown):
{
  "title": "Understanding ${question.verseRef}: Why [Correct] Not [Wrong]",
  "explanation": "Start by quoting ${question.verseRef} exactly, then explain THIS specific question in detail (250-350 words)",
  "quickTip": "A memory hook SPECIFIC to ${question.verseRef}"
}

Generate UNIQUE, SPECIFIC JSON for THIS question now:
        `.trim(),
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`    ❌ Ollama API returned status ${response.status}`);
      return createFallbackLearningInsight(wrongAnswer, quiz, memberName);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    console.log(`    📝 Ollama response: ${text.length} chars`);

    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      console.error(`    ❌ No valid JSON in response`);
      return createFallbackLearningInsight(wrongAnswer, quiz, memberName);
    }

    const jsonText = text.slice(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonText);

    if (!parsed.title || !parsed.explanation) {
      console.error(`    ❌ Missing required fields`);
      return createFallbackLearningInsight(wrongAnswer, quiz, memberName);
    }

    const content = `
**❌ You answered:** ${wrongAnswer.response}  
**✅ Correct answer:** ${question.answer}  
**📖 Reference:** ${question.verseRef}

---

${parsed.explanation}

---

**💡 Memory Hook:** ${parsed.quickTip}
    `.trim();

    return {
      type: 'COMMON_MISTAKE',
      title: parsed.title,
      content: content,
      questionId: question.id, // ✅ Link to specific question
      insight: null,
      studyTips: null,
      suggestedReading: `${quiz.book.name} ${question.verseRef}`
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('    ❌ Timeout after 30s');
    } else {
      console.error('    ❌ Error:', error.message);
    }
    return createFallbackLearningInsight(wrongAnswer, quiz, memberName);
  }
}

// CORE FUNCTION: Generate reinforcement for correct answers
async function generateReinforcementInsight(
  correctAnswer: any,
  quiz: any,
  memberName: string
): Promise<any | null> {
  try {
    const question = correctAnswer.question;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are celebrating ${memberName}'s correct answer and deepening understanding.

CONTEXT:
Question: ${question.text}
Their Correct Answer: "${question.answer}"
${question.options ? `Wrong Options Were: ${JSON.parse(question.options).filter((o: string) => o !== question.answer).join(', ')}` : ''}
Verse: ${question.verseRef}

YOUR TASK:
Write 120-180 words that:
1. **Celebrate**: Genuinely affirm they got it right
2. **Why It Matters**: Explain biblical significance  
3. **What Was Tricky**: Show why wrong answers were tempting
4. **Go Deeper**: Add context or connection they might not know

Be encouraging but substantive. Make them feel smart AND teach something new.

RESPONSE FORMAT (JSON only):
{
  "title": "Great Job: [Topic]",
  "content": "Full explanation here (120-180 words)"
}

Generate JSON:
        `.trim(),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const jsonText = text.slice(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonText);

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

  } catch (error) {
    console.error('Error generating reinforcement:', error);
    return null;
  }
}

// Fallback for when AI generation fails
function createFallbackLearningInsight(
  wrongAnswer: any,
  quiz: any,
  memberName: string
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
  let content = `**${memberName}**, here's how you did:\n\n`;

  content += `**📊 Final Score: ${correctCount}/${totalCount} (${percentage}%)**\n\n`;

  // Contextual encouragement
  if (percentage >= 90) {
    content += `🌟 **Outstanding Performance!** Your biblical knowledge is excellent. You're well-prepared for camp quiz!\n\n`;
  } else if (percentage >= 75) {
    content += `🎯 **Great Work!** You have a strong grasp of this passage. Review the mistakes above to be fully ready.\n\n`;
  } else if (percentage >= 60) {
    content += `👍 **Good Effort!** You're building solid knowledge. Focus on the incorrect answers above to improve.\n\n`;
  } else if (percentage >= 40) {
    content += `💪 **Keep Studying!** Review all the feedback above carefully. You'll see improvement with practice.\n\n`;
  } else {
    content += `📚 **More Study Needed!** This passage needs attention. Read through all the explanations above carefully and review the scripture passage.\n\n`;
  }

  // Performance breakdown by type
  const fillInBlank = answers.filter(a => a.question.type === 'FILL_IN_BLANK');
  const multipleChoice = answers.filter(a => a.question.type === 'MULTIPLE_CHOICE');
  const descriptive = answers.filter(a => a.question.type === 'DESCRIPTIVE');

  if (fillInBlank.length > 0 || multipleChoice.length > 0 || descriptive.length > 0) {
    content += `**📈 Performance by Question Type:**\n\n`;

    if (fillInBlank.length > 0) {
      const fibCorrect = fillInBlank.filter(a => a.isCorrect).length;
      const fibPercent = Math.round((fibCorrect / fillInBlank.length) * 100);
      content += `- 📝 Fill in the Blank: ${fibCorrect}/${fillInBlank.length} (${fibPercent}%)\n`;
    }

    if (multipleChoice.length > 0) {
      const mcCorrect = multipleChoice.filter(a => a.isCorrect).length;
      const mcPercent = Math.round((mcCorrect / multipleChoice.length) * 100);
      content += `- ✓ Multiple Choice: ${mcCorrect}/${multipleChoice.length} (${mcPercent}%)\n`;
    }

    if (descriptive.length > 0) {
      const descCorrect = descriptive.filter(a => a.isCorrect).length;
      const descPercent = Math.round((descCorrect / descriptive.length) * 100);
      content += `- ✍️ Descriptive: ${descCorrect}/${descriptive.length} (${descPercent}%)\n`;
    }

    content += `\n`;
  }

  // Specific weak areas
  const weakQuestions = answers.filter(a => !a.isCorrect);
  if (weakQuestions.length > 0) {
    content += `**🎯 Focus Areas for Camp Quiz:**\n\n`;
    weakQuestions.slice(0, 3).forEach((q, idx) => {
      content += `${idx + 1}. Review ${q.question.verseRef} - "${q.question.text.substring(0, 50)}..."\n`;
    });
    content += `\n`;
  }

  // Next steps
  content += `---\n\n`;
  if (percentage < 80) {
    content += `**🔥 Next Steps:** Review each wrong answer above. They have detailed explanations to help you understand what you missed. Then re-read the entire passage from ${answers[0]?.question?.verseRef || 'the chapter'} to see it in context.`;
  } else {
    content += `**🔥 Next Steps:** You're doing great! Read through the insights above to deepen your understanding even further. You're ready for camp quiz!`;
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
    return `No additional practice questions available from other members yet.\n\nAs more members complete the quiz, their questions will appear here for your practice!`;
  }

  let content = `These questions were given to other members from the same passage. Practice them to expand your knowledge:\n\n`;
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
          const marker = isCorrect ? '✅' : '○';
          content += `${marker} **${letter}.** ${option}\n`;
        });
        content += `\n`;
      } catch (error) {
        content += `**Answer:** ${question.answer}\n\n`;
      }
    } else if (question.type === 'FILL_IN_BLANK') {
      // Show the question with answer revealed
      const fullText = question.text.replace('____', `**${question.answer}**`);
      content += `**Complete sentence:** ${fullText}\n\n`;
    } else {
      content += `**Answer:** ${question.answer}\n\n`;
    }
    
    content += `---\n\n`;
  });

  content += `**💡 Study Tip:** Try covering the answers and testing yourself first!`;

  return content;
}