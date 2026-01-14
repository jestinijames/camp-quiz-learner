/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/answer/[answerId]/update-score/route.ts
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
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
    const answerId = parseInt(resolvedParams.answerId);
    const { points, feedback } = await request.json();

    // Update the answer
    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        points: points,
        feedback: feedback,
        isCorrect: points > 0 ? true : false
      },
      include: {
        QuizSession: true,
        Question: true
      }
    });

    // Recalculate session total
    const sessionAnswers = await prisma.answer.findMany({
      where: { sessionId: updatedAnswer.sessionId }
    });

    const totalScore = sessionAnswers.reduce((sum, answer) => 
      sum + (answer.points || 0), 0
    );

    await prisma.quizSession.update({
      where: { id: updatedAnswer.sessionId },
      data: { totalScore }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating score:', error);
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
  }
}