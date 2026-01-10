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
        wordle: {
          isActive: true // Only show reviews from active wordles
        }
      },
      include: {
        wordle: {
          include: {
            book: true
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
      wordleTitle: attempt.wordle.title,
      assignedWord: attempt.assignedWord,
      won: attempt.won,
      attempts: attempt.attempts,
      points: attempt.points,
      completedAt: attempt.completedAt?.toISOString() || '',
      verseReference: {
        book: attempt.wordle.book.name,
        fromChapter: attempt.wordle.fromChapter,
        fromVerse: attempt.wordle.fromVerse,
        toChapter: attempt.wordle.toChapter,
        toVerse: attempt.wordle.toVerse
      },
      hint: attempt.wordle.hint
    }));

    return NextResponse.json(reviews);

  } catch (error: any) {
    console.error('Error fetching wordle review:', error);
    return NextResponse.json({ error: 'Failed to fetch wordle review' }, { status: 500 });
  }
}
