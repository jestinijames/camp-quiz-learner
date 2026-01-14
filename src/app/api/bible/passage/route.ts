import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '../../../../../lib/prisma';



export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = parseInt(searchParams.get('bookId') || '0');
    const fromChapter = parseInt(searchParams.get('fromChapter') || '0');
    const fromVerse = parseInt(searchParams.get('fromVerse') || '0');
    const toChapter = parseInt(searchParams.get('toChapter') || '0');
    const toVerse = parseInt(searchParams.get('toVerse') || '0');

    if (!bookId || !fromChapter || !toChapter) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch all chapters in range
    const chapters = await prisma.bibleChapter.findMany({
      where: {
        bookId,
        number: {
          gte: fromChapter,
          lte: toChapter,
        },
      },
      include: {
        BibleVerse: true,
      },
      orderBy: { number: 'asc' },
    });

    // Filter verses based on range
    const verses: { chapter: number; verse: number; text: string }[] = [];
    
    for (const chapter of chapters) {
      for (const verse of chapter.BibleVerse) {
        // Check if verse is in range
        if (chapter.number === fromChapter && verse.number < fromVerse) {
          continue;
        }
        if (chapter.number === toChapter && verse.number > toVerse) {
          continue;
        }

        verses.push({
          chapter: chapter.number,
          verse: verse.number,
          text: verse.text,
        });
      }
    }

    // Sort by chapter and verse
    verses.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    return NextResponse.json(verses);
  } catch (error) {
    console.error('Error fetching passage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passage' },
      { status: 500 }
    );
  }
}
