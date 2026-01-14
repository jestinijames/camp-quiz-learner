/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(request: Request) {
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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const fromChapter = searchParams.get('fromChapter');
    const fromVerse = searchParams.get('fromVerse');
    const toChapter = searchParams.get('toChapter');
    const toVerse = searchParams.get('toVerse');
    const poolSize = searchParams.get('poolSize');

    if (!bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json(
        { error: 'All scripture range parameters are required' },
        { status: 400 }
      );
    }

    const requestedPoolSize = poolSize ? parseInt(poolSize) : 20; // Generate 20 verse pairs by default

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
          verseCount: versesInRange.length,
          requiredVerses: 8,
        },
        { status: 400 }
      );
    }

    // Select verses strategically:
    // 1. Prefer shorter verses for mobile readability (15 words or less)
    // 2. Select more than needed so different users get different verses
    const shortVerses = versesInRange.filter(v => v.text.split(' ').length <= 15);
    const mediumVerses = versesInRange.filter(v => {
      const words = v.text.split(' ').length;
      return words > 15 && words <= 25;
    });

    // Prioritize short verses, then add medium if needed
    const sortedByLength = [...shortVerses, ...mediumVerses].sort((a, b) => a.text.split(' ').length - b.text.split(' ').length);
    
    // Randomly shuffle to add variety
    const shuffled = sortedByLength.sort(() => Math.random() - 0.5);
    
    // Select the pool size (minimum 8, up to requested pool size)
    const poolCount = Math.min(Math.max(8, requestedPoolSize), shuffled.length);
    const selectedVerses = shuffled.slice(0, poolCount);

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
        fullVerse: v.text,
      };
    });

    return NextResponse.json({
      success: true,
      versePairs,
      totalVerses: versePairs.length,
      availableVerses: shuffled.length,
      message: `Generated ${versePairs.length} verse pairs from ${book.name} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}`,
    });
  } catch (error: any) {
    console.error('Error generating verse pairs:', error);
    return NextResponse.json(
      { error: 'Failed to generate verse pairs' },
      { status: 500 }
    );
  }
}
