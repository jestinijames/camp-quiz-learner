/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generatePersonalizedTrivia(
  memberName: string,
  teamName: string,
  answers: any[],
  quiz: any,
  prisma: any
): Promise<any[]> {
  const triviaItems: any[] = [];

  // 1. THEIR QUESTIONS AND ANSWERS
  const myQuestionsTrivia = {
    type: 'INSIGHT',
    title: `📝 Your Questions - ${quiz.title}`,
    content: buildMyQuestionsContent(answers, memberName),
    insight: `Review these questions to strengthen your knowledge of ${quiz.book.name}.`,
    studyTips: `Focus on the questions you got wrong for better camp quiz preparation.`,
    suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
  };

  triviaItems.push(myQuestionsTrivia);

  // 2. OTHER MEMBERS' QUESTIONS (Random 3-4 questions they didn't see)
  const otherQuestions = await getOtherMembersQuestions(quiz.id, answers.map(a => a.questionId), prisma);
  
  if (otherQuestions.length > 0) {
    const otherQuestionsTrivia = {
      type: 'STUDY_TIP',
      title: `📚 Questions Asked to Other Members`,
      content: buildOtherQuestionsContent(otherQuestions),
      insight: `These questions were asked to your teammates - expand your knowledge!`,
      studyTips: `Study these additional questions to be better prepared for camp quiz.`,
      suggestedReading: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`
    };

    triviaItems.push(otherQuestionsTrivia);
  }

  return triviaItems;
}

function buildMyQuestionsContent(answers: any[], memberName: string): string {
  let content = `${memberName}, here are the questions you were asked:\n\n`;

  answers.forEach((answer, index) => {
    const status = answer.isCorrect ? '✅' : '❌';
    content += `${index + 1}. ${answer.question.text}\n`;
    content += `${status} Your answer: "${answer.response}"\n`;
    content += `✅ Correct answer: "${answer.question.answer}"\n`;
    
    if (answer.question.verseRef) {
      content += `📖 Reference: ${answer.question.verseRef}\n`;
    }
    
    content += '\n';
  });

  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalCount = answers.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  content += `🎯 Final Score: ${correctCount}/${totalCount} (${percentage}%)`;

  return content;
}

async function getOtherMembersQuestions(quizId: number, myQuestionIds: number[], prisma: any): Promise<any[]> {
  // Get 3-4 random questions from this quiz that the current member didn't answer
  const otherQuestions = await prisma.question.findMany({
    where: {
      quizId: quizId,
      id: {
        notIn: myQuestionIds
      }
    },
    take: 4,
    orderBy: {
      order: 'asc'  // Or use prisma random if available
    }
  });

  return otherQuestions;
}

function buildOtherQuestionsContent(questions: any[]): string {
  let content = `Here are questions that were asked to other members:\n\n`;

  questions.forEach((question, index) => {
    content += `${index + 1}. ${question.text}\n`;
    content += `✅ Answer: "${question.answer}"\n`;
    
    if (question.verseRef) {
      content += `📖 Reference: ${question.verseRef}\n`;
    }
    
    content += '\n';
  });

  content += `💡 Study these to be even more prepared for camp quiz!`;

  return content;
}
