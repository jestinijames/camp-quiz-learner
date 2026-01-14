/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';


import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get all quiz sessions for this member
    const sessions = await prisma.quizSession.findMany({
      where: {
        memberId: member.id,
        isSubmitted: true,
        TriviaItem: {
          some: { isPublished: true }
        }
      },
      include: {
        QuizInstance: {
          include: { BibleBook: true }
        },
        TriviaItem: {
          where: { isPublished: true },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'desc' }
          ]
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Format response grouped by session
    const triviaBySession = sessions.map(session => ({
      sessionId: session.id,
      quizTitle: session.QuizInstance.title,
      quizId: session.QuizInstance.id,
      bookName: session.QuizInstance.BibleBook.name,
      completedAt: session.completedAt,
      totalScore: session.totalScore,
      triviaItems: session.TriviaItem
    }));

    return NextResponse.json(triviaBySession);

  } catch (error: any) {
    console.error('❌ Error fetching personal trivia:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}