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

    // Parse verse pairs from the game
    let versePairs = JSON.parse(activeGame.verseData);
    
    // If we have more than 8 pairs (pool system), randomly select 8 for this user
    if (versePairs.length > 8) {
      // Create a deterministic random selection based on user ID and game ID
      // This ensures the same user always gets the same pairs for this game
      const seed = decoded.id + activeGame.id;
      const shuffled = [...versePairs].sort(() => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x) - 0.5;
      });
      versePairs = shuffled.slice(0, 8);
    }

    return NextResponse.json({
      game: {
        id: activeGame.id,
        title: activeGame.title,
        verseData: JSON.stringify(versePairs), // Send only 8 pairs to the user
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
