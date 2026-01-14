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

    // Find the current member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get all completed wordle attempts for this member (only from active wordles)
    const attempts = await prisma.wordleAttempt.findMany({
      where: {
        memberId: member.id,
        completed: true,
        WordleInstance: {
          isActive: true // Only show reviews from active wordles
        }
      },
      include: {
        WordleInstance: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Format the response
    const reviews = attempts.map(attempt => ({
      attemptId: attempt.id,
      wordleTitle: attempt.WordleInstance.title,
      assignedWord: attempt.assignedWord,
      won: attempt.won,
      attempts: attempt.attempts,
      points: attempt.points,
      completedAt: attempt.completedAt?.toISOString() || '',
      verseReference: {
        book: attempt.WordleInstance.BibleBook.name,
        fromChapter: attempt.WordleInstance.fromChapter,
        fromVerse: attempt.WordleInstance.fromVerse,
        toChapter: attempt.WordleInstance.toChapter,
        toVerse: attempt.WordleInstance.toVerse
      },
      hint: attempt.WordleInstance.hint
    }));

    return NextResponse.json(reviews);

  } catch (error: any) {
    console.error('Error fetching wordle review:', error);
    return NextResponse.json({ error: 'Failed to fetch wordle review' }, { status: 500 });
  }
}
