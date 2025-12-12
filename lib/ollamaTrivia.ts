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

  // Separate by question type
  const fillInBlankAnswers = answers.filter(a => a.question.type === 'FILL_IN_BLANK');
  const multipleChoiceAnswers = answers.filter(a => a.question.type === 'MULTIPLE_CHOICE');
  const descriptiveAnswers = answers.filter(a => a.question.type === 'DESCRIPTIVE');

  // 1. Generate personalized learning insights for WRONG answers (most important)
  const wrongAnswers = answers.filter(a => !a.isCorrect);
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
    // Pick 2-3 of the most interesting correct answers
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

  // 3. Performance Summary (encouraging, not just stats)
  const summaryTrivia = {
    type: 'INSIGHT',
    title: `🎯 Your Quiz Journey - ${quiz.title}`,
    content: buildEncouragingSummary(memberName, correctCount, totalCount, percentage, answers),
    insight: getPersonalizedEncouragement(percentage),
    studyTips: `Focus on understanding the context of each verse, not just memorizing words. The camp quiz will test your comprehension!`,
    suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
  };

  triviaItems.push(summaryTrivia);

  // 4. Additional study questions from other members
  const otherQuestions = await getOtherMembersQuestions(quiz.id, answers.map(a => a.questionId), prisma);
  
  if (otherQuestions.length > 0) {
    const otherQuestionsTrivia = {
      type: 'STUDY_TIP',
      title: `📚 Expand Your Knowledge`,
      content: buildOtherQuestionsContent(otherQuestions),
      insight: `These questions cover different aspects of the same passage. Practicing them will give you a more complete understanding.`,
      studyTips: `Try answering these on your own, then check the answers. Understanding multiple perspectives on the same scripture strengthens your knowledge.`,
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

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are a compassionate Bible study teacher helping ${memberName} learn from a mistake they made on a quiz.

CONTEXT:
Bible Passage: ${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}
Question Type: ${questionType}
Question: ${question.text}
Student's Answer: ${wrongAnswer.response}
Correct Answer: ${question.answer}
${question.options ? `Available Options: ${JSON.parse(question.options).join(', ')}` : ''}
Verse Reference: ${question.verseRef}

YOUR TASK:
Create an educational, encouraging explanation that helps ${memberName} understand:
1. WHY their answer was incorrect (root cause of the mistake)
2. WHAT the correct answer means in the context of the passage
3. HOW to avoid similar mistakes in the future
4. Biblical insights that deepen understanding

TEACHING APPROACH:
- Be encouraging and supportive, not judgmental
- Explain the biblical context thoroughly
- Point out WHY the wrong answer seemed plausible (validate their thinking process)
- Show the specific wording or details in the passage that reveal the correct answer
- Make connections to the broader biblical narrative when relevant
- Use 150-250 words for depth

${questionType === 'FILL_IN_BLANK' ? `
FILL IN THE BLANK FOCUS:
- Explain what the specific word/phrase means in context
- Show why this exact wording matters biblically
- Explain how their answer differs in meaning from the correct answer
- Point to the exact verse where the correct answer appears
` : ''}

${questionType === 'MULTIPLE_CHOICE' ? `
MULTIPLE CHOICE FOCUS:
- Explain why the student's choice seemed reasonable but is incorrect
- Show the subtle differences between the wrong answer and correct answer
- Point out the specific biblical details that make the correct answer right
- Explain why each wrong option doesn't fit the passage
` : ''}

${questionType === 'DESCRIPTIVE' ? `
DESCRIPTIVE FOCUS:
- Identify what key concepts or details the student missed
- Explain the theological or narrative significance of what they missed
- Show how to better analyze descriptive questions in future
- Build their confidence in tackling complex questions
` : ''}

RESPONSE FORMAT (JSON only):
{
  "title": "Understanding [Topic] - Why [Brief explanation]",
  "explanation": "Your detailed, educational explanation here (150-250 words)",
  "keyTakeaway": "One sentence summarizing the most important lesson",
  "studyTip": "Practical tip for similar questions",
  "verseConnection": "How this connects to the broader passage"
}

Generate the learning insight now (JSON only):
        `.trim(),
      }),
    });

    if (!response.ok) {
      console.error('Ollama API error for learning insight');
      return null;
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    // Extract JSON
    let jsonText = '';
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1) {
        jsonText = text.slice(startIndex, endIndex + 1);
      } else {
        return createFallbackLearningInsight(wrongAnswer, quiz, memberName);
      }
    }

    const parsed = JSON.parse(jsonText);

    // Build comprehensive trivia content
    const content = `
**❌ Question:** ${question.text}

**Your Answer:** ${wrongAnswer.response}
**Correct Answer:** ${question.answer}
**Reference:** ${question.verseRef}

---

### 📖 Understanding Your Mistake

${parsed.explanation}

---

### 💡 Key Takeaway
${parsed.keyTakeaway}

### 🎯 Study Tip for Next Time
${parsed.studyTip}

### 🔗 Connection to the Passage
${parsed.verseConnection}
    `.trim();

    return {
      type: 'COMMON_MISTAKE',
      title: `❌ ${parsed.title}`,
      content: content,
      insight: `This is a common mistake! Understanding why will help you avoid it on the camp quiz.`,
      studyTips: parsed.studyTip,
      suggestedReading: `${quiz.book.name} ${question.verseRef}`
    };

  } catch (error) {
    console.error('Error generating learning insight:', error);
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
You are a Bible study teacher celebrating ${memberName}'s correct answer and deepening their understanding.

CONTEXT:
Bible Passage: ${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}
Question: ${question.text}
Correct Answer: ${question.answer}
${question.options ? `Other Options: ${JSON.parse(question.options).filter((o: string) => o !== question.answer).join(', ')}` : ''}
Verse Reference: ${question.verseRef}

YOUR TASK:
Create an encouraging message that:
1. CELEBRATES their correct answer with genuine enthusiasm
2. EXPLAINS why this answer is significant biblically
3. SHOWS how this could have been tricky (what made other answers plausible)
4. DEEPENS their understanding with additional context or connections
5. PREPARES them for similar challenging questions

TEACHING APPROACH:
- Be genuinely encouraging and affirming
- Reveal the "behind the scenes" of the question's difficulty
- Show what makes this knowledge valuable
- Make them feel accomplished while learning more
- Use 100-150 words

RESPONSE FORMAT (JSON only):
{
  "celebration": "Brief enthusiastic affirmation (1-2 sentences)",
  "whyItMatters": "Biblical significance of this answer (2-3 sentences)",
  "trickyParts": "What made this question challenging or what wrong answers seemed plausible (2 sentences)",
  "deeperInsight": "Additional biblical context or connection (2-3 sentences)"
}

Generate the reinforcement now (JSON only):
        `.trim(),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = data.response?.trim() || '';

    let jsonText = '';
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1) {
        jsonText = text.slice(startIndex, endIndex + 1);
      } else {
        return null;
      }
    }

    const parsed = JSON.parse(jsonText);

    const content = `
**✅ Question:** ${question.text}

**Your Answer:** ${question.answer} ✓
**Reference:** ${question.verseRef}

---

### 🎉 Well Done!
${parsed.celebration}

### 📖 Why This Matters
${parsed.whyItMatters}

### 🧠 What Made This Tricky
${parsed.trickyParts}

### 🔍 Going Deeper
${parsed.deeperInsight}
    `.trim();

    return {
      type: 'ENCOURAGEMENT',
      title: `✅ Great Job on "${question.text.substring(0, 50)}..."`,
      content: content,
      insight: `You got this right! Let's deepen your understanding even more.`,
      studyTips: `You clearly understood the context. Keep paying attention to specific wording in the passages!`,
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

  return {
    type: 'COMMON_MISTAKE',
    title: `❌ Review: ${question.text.substring(0, 50)}...`,
    content: `
**Question:** ${question.text}

**Your Answer:** ${wrongAnswer.response}
**Correct Answer:** ${question.answer}
**Reference:** ${question.verseRef}

---

### 📖 What to Study

You answered this question incorrectly. The correct answer is "${question.answer}" from ${question.verseRef}.

Take time to read this verse carefully and understand the specific wording used. Pay attention to:
- The exact words and phrases in the verse
- The context of what comes before and after
- Who is speaking and who is being addressed
- The theological or narrative significance

### 🎯 Study Tip

When you see similar questions on the camp quiz, make sure to read the verse carefully and look for the specific details being asked about. Don't rush - precision matters in Bible knowledge!
    `.trim(),
    insight: `Review this passage carefully to prepare for similar questions on the camp quiz.`,
    studyTips: `Read ${quiz.book.name} ${question.verseRef} multiple times and pay attention to the exact wording.`,
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
  let content = `Hey **${memberName}**! 👋\n\n`;

  // Contextual encouragement based on performance
  if (percentage >= 90) {
    content += `🌟 **Outstanding!** You scored **${correctCount}/${totalCount} (${percentage}%)**\n\n`;
    content += `Your biblical knowledge is impressive! You clearly understand the nuances of this passage. You're well-prepared for the camp quiz, but don't stop here - keep studying to stay sharp!\n\n`;
  } else if (percentage >= 75) {
    content += `🎯 **Excellent work!** You scored **${correctCount}/${totalCount} (${percentage}%)**\n\n`;
    content += `You've got a strong grasp of this passage! With a bit more focus on the areas you missed, you'll be fully ready for the camp quiz. You're on the right track!\n\n`;
  } else if (percentage >= 60) {
    content += `👍 **Good effort!** You scored **${correctCount}/${totalCount} (${percentage}%)**\n\n`;
    content += `You're building solid knowledge! The questions you missed are opportunities to deepen your understanding. Review the detailed feedback below to strengthen those areas for the camp quiz.\n\n`;
  } else if (percentage >= 40) {
    content += `💪 **Keep going!** You scored **${correctCount}/${totalCount} (${percentage}%)**\n\n`;
    content += `Learning scripture takes time and practice! You've made a good start, but you'll need to study the detailed feedback below. Each mistake is a chance to learn something new. Don't get discouraged - improvement comes with consistent effort!\n\n`;
  } else {
    content += `📚 **Let's learn together!** You scored **${correctCount}/${totalCount} (${percentage}%)**\n\n`;
    content += `This passage needs more study time, but that's okay! Everyone starts somewhere. Use the detailed feedback below to understand what you missed. Spend extra time reading the passage slowly and carefully. You've got this!\n\n`;
  }

  content += `---\n\n`;
  content += `### 📊 Your Performance Breakdown\n\n`;

  // Performance by question type
  const fillInBlank = answers.filter(a => a.question.type === 'FILL_IN_BLANK');
  const multipleChoice = answers.filter(a => a.question.type === 'MULTIPLE_CHOICE');
  const descriptive = answers.filter(a => a.question.type === 'DESCRIPTIVE');

  const fibCorrect = fillInBlank.filter(a => a.isCorrect).length;
  const mcCorrect = multipleChoice.filter(a => a.isCorrect).length;
  const descCorrect = descriptive.filter(a => a.isCorrect).length;

  content += `- **Fill in the Blank:** ${fibCorrect}/${fillInBlank.length} correct\n`;
  content += `- **Multiple Choice:** ${mcCorrect}/${multipleChoice.length} correct\n`;
  content += `- **Descriptive:** ${descCorrect}/${descriptive.length} correct\n\n`;

  content += `---\n\n`;
  content += `### 🎯 What's Next?\n\n`;
  content += `Below you'll find detailed explanations for your incorrect answers and insights on your correct ones. Take time to read through each one carefully - they're designed to help you truly understand the passage, not just memorize facts.\n\n`;
  
  if (percentage < 75) {
    content += `**Recommended Action:** Spend 15-20 minutes reviewing the detailed feedback, then re-read the entire passage. Try to see how each question connects to the broader context.\n\n`;
  }

  return content;
}

function getPersonalizedEncouragement(percentage: number): string {
  if (percentage >= 90) {
    return `You're demonstrating exceptional biblical knowledge! Keep this momentum going.`;
  } else if (percentage >= 75) {
    return `You're doing great! A little more study and you'll master this passage completely.`;
  } else if (percentage >= 60) {
    return `You're on the right path. Focus on the areas you missed and you'll see improvement.`;
  } else if (percentage >= 40) {
    return `Don't be discouraged - learning scripture is a journey. Each study session makes you stronger.`;
  } else {
    return `This is just the beginning! With focused study using the feedback below, you'll see significant improvement.`;
  }
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
  let content = `Here are additional questions from the same passage that other members received. Practicing these will give you a more complete understanding:\n\n`;
  content += `---\n\n`;

  questions.forEach((question, index) => {
    content += `**Q${index + 1}.** ${question.text}\n\n`;
    
    if (question.type === 'MULTIPLE_CHOICE' && question.options) {
      try {
        const options = JSON.parse(question.options);
        content += `**Options:**\n\n`;
        options.forEach((option: string, optIndex: number) => {
          const letter = String.fromCharCode(65 + optIndex);
          const isCorrect = option === question.answer;
          const marker = isCorrect ? '✅' : '⚪';
          content += `${marker} **${letter}.** ${option}\n\n`;
        });
      } catch (error) {
        content += `**Answer:** ${question.answer}\n\n`;
      }
    } else {
      content += `**Answer:** ${question.answer}\n\n`;
    }
    
    if (question.verseRef) {
      content += `**Reference:** ${question.verseRef}\n\n`;
    }
    
    content += `---\n\n`;
  });

  content += `💡 **Pro Tip:** Try answering these questions yourself before looking at the answers. This active recall strengthens your memory much more than passive reading!`;

  return content;
}