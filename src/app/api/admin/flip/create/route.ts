/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';


export async function POST(request: Request) {
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

    const body = await request.json();
    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse } = body;

    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Fetch verses from the selected range
    const book = await prisma.bibleBook.findUnique({
      where: { id: parseInt(bookId) },
      include: {
        BibleVersion: true,
        BibleChapter: {
          where: {
            number: {
              gte: parseInt(fromChapter),
              lte: parseInt(toChapter),
            },
          },
          include: {
            BibleVerse: true,
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Bible book not found' }, { status: 404 });
    }

    // Collect verses in range
    const versesInRange: { chapter: number; verse: number; text: string }[] = [];
    for (const chapter of book.BibleChapter) {
      for (const verse of chapter.BibleVerse) {
        const isInRange =
          (chapter.number === parseInt(fromChapter) &&
            verse.number >= parseInt(fromVerse)) ||
          (chapter.number === parseInt(toChapter) &&
            verse.number <= parseInt(toVerse)) ||
          (chapter.number > parseInt(fromChapter) &&
            chapter.number < parseInt(toChapter));

        if (isInRange) {
          versesInRange.push({
            chapter: chapter.number,
            verse: verse.number,
            text: verse.text,
          });
        }
      }
    }

    if (versesInRange.length < 8) {
      return NextResponse.json(
        {
          error: `Need at least 8 verses for the flip game. Selected range has ${versesInRange.length} verses.`,
        },
        { status: 400 }
      );
    }

    // Select 8 verses intelligently (prefer shorter verses for mobile readability)
    const sortedByLength = [...versesInRange].sort((a, b) => a.text.length - b.text.length);
    const selectedVerses = sortedByLength.slice(0, 8);

    // Split each verse into start and end parts
    const versePairs = selectedVerses.map((v) => {
      const words = v.text.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      const start = words.slice(0, midPoint).join(' ') + '...';
      const end = '...' + words.slice(midPoint).join(' ');

      return {
        reference: `${book.name} ${v.chapter}:${v.verse}`,
        start,
        end,
      };
    });

    // Close any existing active flip games
    await prisma.flipGame.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new flip game
    const newGame = await prisma.flipGame.create({
      data: {
        title,
        verseData: JSON.stringify(versePairs),
        bookId: parseInt(bookId),
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        timeLimit: 240, // 4 minutes
        isActive: true,
        adminId: decoded.id,
      },
    });

    return NextResponse.json({
      success: true,
      game: newGame,
      versePairs,
    });
  } catch (error: any) {
    console.error('Error creating flip game:', error);
    return NextResponse.json(
      { error: 'Failed to create flip game' },
      { status: 500 }
    );
  }
}
