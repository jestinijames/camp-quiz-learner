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

    // Get all completed emoji attempts for this member (only from active games)
    const attempts = await prisma.emojiAttempt.findMany({
      where: {
        memberId: member.id,
        completed: true,
        EmojiGame: {
          isActive: true // Only show reviews from active games
        }
      },
      include: {
        EmojiGame: {
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
    const reviews = attempts.map(attempt => {
      const assignedEmoji = JSON.parse(attempt.assignedEmoji);
      
      return {
        attemptId: attempt.id,
        gameTitle: attempt.EmojiGame.title,
        assignedEmoji: {
          emojis: assignedEmoji.emojis,
          verse: assignedEmoji.verse,
          hint: assignedEmoji.hint
        },
        userAnswer: attempt.answer,
        isCorrect: attempt.isCorrect,
        points: attempt.points,
        completedAt: attempt.completedAt?.toISOString() || '',
        verseReference: {
          book: attempt.EmojiGame.BibleBook.name,
          fromChapter: attempt.EmojiGame.fromChapter,
          fromVerse: attempt.EmojiGame.fromVerse,
          toChapter: attempt.EmojiGame.toChapter,
          toVerse: attempt.EmojiGame.toVerse
        }
      };
    });

    return NextResponse.json(reviews);

  } catch (error: any) {
    console.error('Error fetching emoji review:', error);
    return NextResponse.json({ error: 'Failed to fetch emoji review' }, { status: 500 });
  }
}
