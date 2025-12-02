/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/ollamaTrivia.ts
export type TriviaItem = {
  type:
    | "WRONG_ANSWER_REVIEW"
    | "PERFORMANCE_INSIGHT"
    | "COMPARATIVE_STATS"
    | "IMPROVEMENT_TIP";
  title: string;
  content: string;
  verseReference?: string;
  personalNote?: string;
  studyAction?: string;
};

interface Answer {
  questionId: number;
  isCorrect: boolean;
}

interface Session {
  answers: Answer[];
}

interface QuizSessionWithAnswers {
  id: number;
  quizId: number;
  memberId: number;
  isSubmitted: boolean;
  answers: Array<{
    questionId: number;
    isCorrect: boolean;
    response: string;
    question: any;
  }>;
  member: any;
}

export async function generatePersonalizedTrivia(
  memberName: string,
  teamName: string,
  answers: any[],
  quiz: any,
  prisma: any // ADD THIS parameter
): Promise<TriviaItem[]> {
  const triviaItems: TriviaItem[] = [];

  // Analyze performance data
  const wrongAnswers = answers.filter((a) => a.isCorrect === false);
  const correctAnswers = answers.filter((a) => a.isCorrect === true);
  const totalAnswers = answers.length;
  const scorePercentage = Math.round(
    (correctAnswers.length / totalAnswers) * 100
  );

  // NEW: Calculate comparative stats from database
  const allSessionsForQuiz = await prisma.quizSession.findMany({
    where: {
      quizId: quiz.id,
      isSubmitted: true,
    },
    include: {
      answers: { include: { question: true } },
      member: true,
    },
  });

  const totalParticipants = allSessionsForQuiz.length;

  // Calculate question difficulty (which questions were hardest)
  const questionStats: { [key: number]: { correct: number; total: number } } =
    {};

  (allSessionsForQuiz as Session[]).forEach((session: Session): void => {
    session.answers.forEach((answer: Answer): void => {
      if (!questionStats[answer.questionId]) {
        questionStats[answer.questionId] = { correct: 0, total: 0 };
      }
      questionStats[answer.questionId].total++;
      if (answer.isCorrect) {
        questionStats[answer.questionId].correct++;
      }
    });
  });

  const allScores: number[] = (allSessionsForQuiz as QuizSessionWithAnswers[])
    .map((session: QuizSessionWithAnswers): number => {
      const sessionCorrect: number = session.answers.filter(
        (a): boolean => a.isCorrect
      ).length;
      return Math.round((sessionCorrect / session.answers.length) * 100);
    })
    .sort((a: number, b: number): number => b - a);

  const userRank: number =
    allScores.findIndex((score: number) => score <= scorePercentage) + 1;

  // Find streak of correct answers
  let longestStreak = 0;
  let currentStreak = 0;
  const sortedAnswers = answers.sort(
    (a, b) => a.question.order - b.question.order
  );

  sortedAnswers.forEach((answer) => {
    if (answer.isCorrect) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // 1. WRONG ANSWER REVIEWS with difficulty stats
  wrongAnswers.slice(0, 2).forEach((wrongAnswer) => {
    const qStats = questionStats[wrongAnswer.questionId];
    const difficultyPercentage = qStats
      ? Math.round((qStats.correct / qStats.total) * 100)
      : 0;

    let difficultyText = "";
    if (difficultyPercentage < 30) {
      difficultyText = `This was the hardest question - only ${difficultyPercentage}% got it right! 🔥`;
    } else if (difficultyPercentage < 60) {
      difficultyText = `This was tricky - only ${difficultyPercentage}% got it right. 🤔`;
    } else {
      difficultyText = `${difficultyPercentage}% of people got this right. You can do better! 💪`;
    }

    triviaItems.push({
      type: "WRONG_ANSWER_REVIEW",
      title: `❌ You missed this one`,
      content: `Question: ${wrongAnswer.question.text}\n\nYour answer: "${wrongAnswer.response}"\n✅ Correct answer: "${wrongAnswer.question.answer}"\n\n📊 ${difficultyText}\n\n💡 Key point: ${wrongAnswer.question.answer} - drill this before camp quiz!`,
      verseReference: wrongAnswer.question.verseRef,
      personalNote: `${memberName}, even tough questions are conquerable with study!`,
      studyAction: `Write down: "${wrongAnswer.question.answer}" and review it 5 times.`,
    });
  });

  // 2. PERFORMANCE ANALYSIS with comparative rankings
  const questionsByType = answers.reduce((acc: any, answer) => {
    if (!acc[answer.question.type])
      acc[answer.question.type] = { correct: 0, total: 0 };
    acc[answer.question.type].total++;
    if (answer.isCorrect) acc[answer.question.type].correct++;
    return acc;
  }, {});

  let strongestArea = "";
  let weakestArea = "";
  let highestScore = 0;
  let lowestScore = 100;

  Object.entries(questionsByType).forEach(([type, stats]: [string, any]) => {
    const percentage = Math.round((stats.correct / stats.total) * 100);
    if (percentage > highestScore) {
      highestScore = percentage;
      strongestArea =
        type === "FILL_IN_BLANK"
          ? "Fill-in-the-blank"
          : type === "MULTIPLE_CHOICE"
          ? "Multiple choice"
          : "Descriptive";
    }
    if (percentage < lowestScore) {
      lowestScore = percentage;
      weakestArea =
        type === "FILL_IN_BLANK"
          ? "Fill-in-the-blank"
          : type === "MULTIPLE_CHOICE"
          ? "Multiple choice"
          : "Descriptive";
    }
  });

  if (strongestArea && weakestArea && strongestArea !== weakestArea) {
    triviaItems.push({
      type: "PERFORMANCE_INSIGHT",
      title: `📊 Your Performance vs Others`,
      content: `Your rank: #${userRank} out of ${totalParticipants} participants 🏆\n\nStrong area: ${strongestArea} (${highestScore}%)\nGrowth area: ${weakestArea} (${lowestScore}%)\n\n${
        longestStreak >= 3
          ? `🔥 Awesome streak: ${longestStreak} correct in a row!`
          : "💪 Work on building longer correct streaks."
      }`,
      personalNote:
        userRank <= Math.ceil(totalParticipants * 0.3)
          ? `${memberName}, you're in the top performers! 🌟`
          : `${memberName}, you have room to climb the leaderboard! 📈`,
      studyAction: `Focus on ${weakestArea.toLowerCase()} to boost your rank!`,
    });
  }

  // 3. COMPARATIVE QUIZ STATISTICS with camp readiness
  const averageScore = Math.round(
    allScores.reduce((a, b) => a + b, 0) / allScores.length
  );
  const readinessLevel =
    scorePercentage >= 85
      ? "Excellent"
      : scorePercentage >= 70
      ? "Good"
      : scorePercentage >= 55
      ? "Fair"
      : "Needs Work";

  const readinessColor =
    scorePercentage >= 85
      ? "🟢"
      : scorePercentage >= 70
      ? "🟡"
      : scorePercentage >= 55
      ? "🟠"
      : "🔴";

  const performanceComparison =
    scorePercentage > averageScore
      ? `above average (avg: ${averageScore}%) 📈`
      : scorePercentage === averageScore
      ? `exactly average (avg: ${averageScore}%) 📊`
      : `below average (avg: ${averageScore}%) 📉`;

  triviaItems.push({
    type: "COMPARATIVE_STATS",
    title: `🎯 Your ${quiz.title} Results`,
    content: `Final Score: ${
      correctAnswers.length
    }/${totalAnswers} (${scorePercentage}%)\nYour performance: ${performanceComparison}\nRank: #${userRank}/${totalParticipants}\n\nCamp Quiz Readiness: ${readinessColor} ${readinessLevel}\n\n${
      scorePercentage >= 85
        ? "🏆 Outstanding! Top performer!"
        : scorePercentage >= averageScore
        ? "👍 Good work! You beat the average."
        : "📚 Study more to reach average level."
    }`,
    verseReference: `${quiz.book.name} ${quiz.fromChapter}:${quiz.fromVerse}-${quiz.toChapter}:${quiz.toVerse}`,
    personalNote: `${memberName}, Team ${teamName} ${
      userRank <= 3
        ? "is proud of your top performance"
        : "is counting on your improvement"
    }.`,
    studyAction:
      scorePercentage >= averageScore
        ? "Help teammates who scored below average!"
        : `Study harder to beat the ${averageScore}% average score.`,
  });

  // 4. IMPROVEMENT STRATEGY with hardest questions focus
  if (wrongAnswers.length >= 1) {
    const hardestMissedQuestions = wrongAnswers
      .map((a) => ({
        ...a,
        difficulty: questionStats[a.questionId]
          ? Math.round(
              (questionStats[a.questionId].correct /
                questionStats[a.questionId].total) *
                100
            )
          : 50,
      }))
      .sort((a, b) => a.difficulty - b.difficulty)
      .slice(0, 2);

    triviaItems.push({
      type: "IMPROVEMENT_TIP",
      title: `🎯 Focus on Hardest Questions`,
      content: `You missed ${
        wrongAnswers.length
      } questions. Here are the toughest ones to master:\n\n${hardestMissedQuestions
        .map(
          (a, i) =>
            `${i + 1}. ${a.question.verseRef || "Key concept"}: ${
              a.question.answer
            }\n   📊 Only ${a.difficulty}% got this right globally!`
        )
        .join("\n")}\n\n🏆 Master these and you'll outperform most campers!`,
      personalNote: `${memberName}, conquering the hardest questions will boost your rank significantly!`,
      studyAction: `Create special flashcards for these ${hardestMissedQuestions.length} tough facts. Review them daily.`,
    });
  }

  return triviaItems.slice(0, 4);
}

// ADD: Function to generate comparative stats (for future enhancement)
export async function generateCampStats(quizId: number): Promise<any> {
  // This could generate insights like:
  // "Only 23% of campers got Question 5 right - it was the hardest!"
  // "Average score for this quiz: 73%"
  // "Most missed question: [question text]"

  // We can implement this later for group-level insights
  return {};
}
