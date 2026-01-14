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
    
    if (decoded.isAdmin) {
      return NextResponse.json({ game: null, attempt: null });
    }

    // Get active flip game
    const activeGame = await prisma.flipGame.findFirst({
      where: { isActive: true },
      include: {
        BibleBook: {
          include: {
            BibleVersion: true,
          },
        },
      },
      orderBy: { createdDate: 'desc' },
    });

    if (!activeGame) {
      return NextResponse.json({ game: null, attempt: null });
    }

    // Check if member has an existing attempt
    const existingAttempt = await prisma.flipAttempt.findUnique({
      where: {
        gameId_memberId: {
          gameId: activeGame.id,
          memberId: decoded.id,
        },
      },
    });

    return NextResponse.json({
      game: {
        id: activeGame.id,
        title: activeGame.title,
        verseData: activeGame.verseData,
        timeLimit: activeGame.timeLimit,
        bookName: activeGame.BibleBook.name,
        versionName: activeGame.BibleBook.BibleVersion.name,
        fromChapter: activeGame.fromChapter,
        fromVerse: activeGame.fromVerse,
        toChapter: activeGame.toChapter,
        toVerse: activeGame.toVerse,
      },
      attempt: existingAttempt,
    });
  } catch (error: any) {
    console.error('Error fetching active flip game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flip game' },
      { status: 500 }
    );
  }
}
