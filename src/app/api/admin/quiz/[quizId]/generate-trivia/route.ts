/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/quiz/[quizId]/generate-trivia/route.ts
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';
import { TriviaType } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // Analyze quiz results to generate trivia
    const analytics = await analyzeQuizResults(quizId);
    const triviaItems = await generateTriviaFromAnalytics(analytics, quizId, decoded.id);

    return NextResponse.json({
      triviaCount: triviaItems.length,
      analytics
    });

  } catch (error: any) {
    console.error('Trivia generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function analyzeQuizResults(quizId: number) {
  // Get question performance stats
  const questionStats = await prisma.answer.groupBy({
    by: ['questionId'],
    where: { 
      session: { quizId, isSubmitted: true },
      isCorrect: { not: null }
    },
    _count: { id: true },
    _sum: { points: true },
    _avg: { points: true }
  });

  // Get detailed analytics for trivia generation
  const analytics = await Promise.all(
    questionStats.map(async (stat) => {
      const question = await prisma.question.findUnique({
        where: { id: stat.questionId }
      });

      const answers = await prisma.answer.findMany({
        where: { questionId: stat.questionId },
        include: { session: { include: { member: true } } }
      });

      const correctCount = answers.filter(a => a.isCorrect === true).length;
      const incorrectCount = answers.filter(a => a.isCorrect === false).length;
      const commonMistakes = getCommonMistakes(answers.filter(a => a.isCorrect === false));

      return {
        questionId: stat.questionId,
        question,
        totalAttempts: stat._count.id,
        correctCount,
        incorrectCount,
        averageScore: stat._avg.points,
        commonMistakes,
        difficultyLevel: correctCount / stat._count.id < 0.5 ? 'hard' : 'easy'
      };
    })
  );

  return analytics;
}

async function generateTriviaFromAnalytics(analytics: any[], quizId: number, adminId: number) {
  const triviaItems = [];

  for (const questionAnalysis of analytics) {
    const { question, totalAttempts, correctCount, incorrectCount, commonMistakes, difficultyLevel } = questionAnalysis;

    // Generate different types of trivia based on performance
    if (difficultyLevel === 'hard' && incorrectCount > totalAttempts * 0.5) {
      triviaItems.push({
        quizId,
        questionId: question.id,
        type: TriviaType.COMMON_MISTAKE,
        title: `Common Challenge: ${question.verseRef || 'Bible Knowledge'}`,
        content: `${Math.round((incorrectCount/totalAttempts) * 100)}% of participants found this question challenging. The correct answer focuses on: ${question.answer.substring(0, 100)}...`,
        insight: `This passage teaches us about ${getInsightFromQuestion(question)}`,
        totalAttempts,
        correctCount,
        incorrectCount,
        commonMistakes: JSON.stringify(commonMistakes),
        suggestedReading: question.verseRef,
        studyTips: generateStudyTip(question),
        isPublished: true,
        publishedAt: new Date(),
        priority: incorrectCount > totalAttempts * 0.7 ? 1 : 2,
        adminId
      });
    }

    if (correctCount < totalAttempts * 0.3) {
      triviaItems.push({
        quizId,
        questionId: question.id,
        type: TriviaType.CHALLENGE,
        title: `Master Level: ${question.verseRef || 'Advanced'}`,
        content: `Only ${Math.round((correctCount/totalAttempts) * 100)}% got this right! Well done if you were one of them.`,
        insight: `This demonstrates deep understanding of ${getInsightFromQuestion(question)}`,
        totalAttempts,
        correctCount,
        incorrectCount,
        isPublished: true,
        publishedAt: new Date(),
        priority: 1,
        adminId
      });
    }
  }

  // Save trivia items to database
  if (triviaItems.length > 0) {
    await prisma.triviaItem.createMany({
      data: triviaItems
    });
  }

  return triviaItems;
}

function getCommonMistakes(wrongAnswers: any[]): string[] {
  const mistakes = new Map();
  
  wrongAnswers.forEach(answer => {
    const response = answer.response.toLowerCase().trim();
    mistakes.set(response, (mistakes.get(response) || 0) + 1);
  });

  return Array.from(mistakes.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([mistake]) => mistake);
}

function getInsightFromQuestion(question: any): string {
  // Generate insights based on question content
  if (question.text.toLowerCase().includes('love')) return 'divine love';
  if (question.text.toLowerCase().includes('faith')) return 'faith and trust';
  if (question.text.toLowerCase().includes('grace')) return 'God\'s grace';
  // Add more pattern matching
  return 'biblical principles';
}

function generateStudyTip(question: any): string {
  return `Focus on the context around ${question.verseRef}. Read the surrounding verses to better understand the passage.`;
}