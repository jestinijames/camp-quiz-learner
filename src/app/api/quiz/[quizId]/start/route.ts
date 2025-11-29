/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

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
    
    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Member access only' }, { status: 403 });
    }

    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // Check if quiz is active and member hasn't taken it
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz || !quiz.isActive) {
      return NextResponse.json({ error: 'Quiz not available' }, { status: 404 });
    }

    // Check if member already has a session
    const existingSession = await prisma.quizSession.findUnique({
      where: {
        quizId_memberId: {
          quizId,
          memberId: decoded.id
        }
      }
    });

    if (existingSession?.isSubmitted) {
      return NextResponse.json({ error: 'Quiz already completed' }, { status: 400 });
    }

    // Create or return existing session
    let session;
    if (existingSession) {
      session = existingSession;
    } else {
      session = await prisma.quizSession.create({
        data: {
          quizId,
          memberId: decoded.id
        }
      });
    }

    // Return quiz with questions but hide correct answers
    const safeQuestions = quiz.questions.map(q => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options,
      points: q.points,
      order: q.order
    }));

    return NextResponse.json({
      session,
      quiz: {
        ...quiz,
        questions: safeQuestions
      }
    });

  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json({ error: 'Failed to start quiz' }, { status: 500 });
  }
}