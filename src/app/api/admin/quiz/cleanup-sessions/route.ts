/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;

    if (!decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const abandonedSessions = await prisma.quizSession.findMany({
      where: { isSubmitted: false },
      include: {
        member: { select: { firstName: true } },
        quiz: { select: { title: true } }
      }
    });

    if (abandonedSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No abandoned sessions to clean up',
        deletedSessions: []
      });
    }

    const sessionIds = abandonedSessions.map(s => s.id);

    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });

      await tx.questionUsage.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });

      await tx.triviaItem.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });

      await tx.quizSession.deleteMany({
        where: { isSubmitted: false }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${abandonedSessions.length} abandoned session(s)`,
      deletedSessions: abandonedSessions.map(s => ({
        member: s.member.firstName,
        quiz: s.quiz.title,
        startTime: s.startTime
      }))
    });

  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup sessions',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
