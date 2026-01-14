/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';
import { correctFillInBlank } from '../../../../../../../lib/fillInBlankCorrection';


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
        QuizInstance: {
          include: {
            Question: true
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

    for (const answer of answers) {
      const question = await prisma.question.findUnique({
        where: { id: answer.questionId }
      });

      if (!question) continue;

      let points = 0;
      let isCorrect = false;
      let feedback = '';

      if (question.type === 'MULTIPLE_CHOICE') {
        isCorrect = answer.response.trim() === question.answer.trim();
        points = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.answer}`;
        
      } else if (question.type === 'FILL_IN_BLANK') {
        // Use our new strict fill-in-blank correction
        const result = correctFillInBlank(question.answer, answer.response, question.points);
        isCorrect = result.isCorrect;
        points = result.points;
        feedback = result.feedback;
        
      } else if (question.type === 'DESCRIPTIVE') {
        // Leave for manual/AI correction
        points = 0; // Will be corrected later
        isCorrect = false;
        feedback = 'Awaiting manual review';
      }

      // Save answer with correction
      await prisma.answer.create({
        data: {
          sessionId,
          questionId: answer.questionId,
          response: answer.response,
          points,
          isCorrect,
          feedback
        }
      });

      totalScore += points;
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