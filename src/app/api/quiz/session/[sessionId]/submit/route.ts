/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    const resolvedParams = await params;
    const sessionId = parseInt(resolvedParams.sessionId);

    const { answers, timeSpent } = await request.json();

    // Verify session belongs to user
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!session || session.memberId !== decoded.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.isSubmitted) {
      return NextResponse.json({ error: 'Quiz already submitted' }, { status: 400 });
    }

    // Calculate basic scores for multiple choice and fill in blank
    let totalScore = 0;
    const answerRecords = [];

    for (const answer of answers) {
      const question = session.quiz.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      let score = 0;
      let isCorrect: boolean | null = false;

      // Auto-scoring for objective questions
      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'FILL_IN_BLANK') {
        const userAnswer = answer.response.trim().toLowerCase();
        const correctAnswer = question.answer.trim().toLowerCase();
        
        if (userAnswer === correctAnswer) {
          score = question.points;
          isCorrect = true;
        }
      }
      // Descriptive answers need manual grading
      else if (question.type === 'DESCRIPTIVE') {
        score = 0; // Will be graded later
        isCorrect = null;
      }

      totalScore += score;

      answerRecords.push({
        quizSessionId: sessionId,
        questionId: answer.questionId,
        response: answer.response,
        score,
        isCorrect,
        gradedBy: question.type === 'DESCRIPTIVE' ? null : 'AUTO'
      });
    }

    // Save all answers and update session
    await prisma.$transaction([
      // Create answers
      prisma.answer.createMany({
        data: answerRecords
      }),
      // Update session
      prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          totalScore,
          timeSpent,
          isSubmitted: true
        }
      })
    ]);

    return NextResponse.json({
      message: 'Quiz submitted successfully',
      totalScore,
      needsManualGrading: answerRecords.some(a => a.gradedBy === null)
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}