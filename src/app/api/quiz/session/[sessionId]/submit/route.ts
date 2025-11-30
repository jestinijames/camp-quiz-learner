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

    const { answers } = await request.json();

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

    let totalScore = 0;

    for (const submittedAnswer of answers) {
      const question = await prisma.question.findUnique({
        where: { id: submittedAnswer.questionId }
      });

      if (!question) continue;

      let isCorrect: boolean | null = null;
      let points: number | null = null;

      // FIXED: Auto-correct logic
      if (question.type === 'FILL_IN_BLANK') {
        // Auto-correct: Exact match (case insensitive)
        isCorrect = submittedAnswer.response.toLowerCase().trim() === question.answer.toLowerCase().trim();
        points = isCorrect ? question.points : 0;
        totalScore += points; // Add to total immediately
        
      } else if (question.type === 'MULTIPLE_CHOICE') {
        // Auto-correct: Exact option match
        isCorrect = submittedAnswer.response === question.answer;
        points = isCorrect ? question.points : 0;
        totalScore += points; // Add to total immediately
        
      } else if (question.type === 'DESCRIPTIVE') {
        // FIXED: Leave for admin/AI correction - don't add to score yet
        isCorrect = null;   // Will be set during correction
        points = null;      // Will be set during correction - NOT 0!
        // Don't add to totalScore - will be calculated after correction
      }

      // Save the answer
      await prisma.answer.create({
        data: {
          sessionId: session.id,
          questionId: submittedAnswer.questionId,
          response: submittedAnswer.response,
          isCorrect,
          points // This will be null for descriptive questions
        }
      });
    }

    // Update session with partial score (only auto-graded questions)
    await prisma.quizSession.update({
      where: { id: session.id },
      data: { 
        isSubmitted: true,
        totalScore: totalScore, // Partial score from fill-in-blank and multiple choice only
        completedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      totalScore: totalScore, // Partial score
      message: 'Quiz submitted successfully. Descriptive answers will be corrected by admin.'
    });

  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}