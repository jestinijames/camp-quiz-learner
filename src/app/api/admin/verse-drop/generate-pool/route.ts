/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';


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

    const { bookId, fromChapter, fromVerse, toChapter, toVerse, poolSize } = await request.json();

    const parsedBookId = parseInt(bookId);
    const parsedFromChapter = parseInt(fromChapter);
    const parsedFromVerse = parseInt(fromVerse);
    const parsedToChapter = parseInt(toChapter);
    const parsedToVerse = parseInt(toVerse);
    const requestedPoolSize = poolSize ? parseInt(poolSize) : 30;

    // Fetch verses from the specified range
    const verses = await prisma.bibleVerse.findMany({
      where: {
        BibleChapter: {
          bookId: parsedBookId,
          number: {
            gte: parsedFromChapter,
            lte: parsedToChapter
          }
        },
        number: {
          ...(parsedFromChapter === parsedToChapter 
            ? { gte: parsedFromVerse, lte: parsedToVerse }
            : {})
        }
      },
      include: {
        BibleChapter: true
      },
      orderBy: [
        { BibleChapter: { number: 'asc' } },
        { number: 'asc' }
      ]
    });

    // Filter verses based on chapter boundaries
    const filteredVerses = verses.filter(verse => {
      const chapterNum = verse.BibleChapter.number;
      const verseNum = verse.number;

      // If single chapter, filter by verse range
      if (parsedFromChapter === parsedToChapter) {
        return verseNum >= parsedFromVerse && verseNum <= parsedToVerse;
      }

      // Multi-chapter: filter start and end chapters
      if (chapterNum === parsedFromChapter) {
        return verseNum >= parsedFromVerse;
      }
      if (chapterNum === parsedToChapter) {
        return verseNum <= parsedToVerse;
      }
      
      // Middle chapters: include all verses
      return true;
    });

    // Filter to only verses with 15 words or less (easier difficulty)
    const shortVerses = filteredVerses.filter(verse => {
      const wordCount = verse.text.split(/\s+/).filter((w: string) => w.length > 0).length;
      return wordCount <= 15;
    });
    
    if (shortVerses.length < 5) {
      return NextResponse.json({ 
        error: `Passage only has ${shortVerses.length} verses with 15 words or less. Need at least 5 for a good game. Try selecting a larger passage.`,
        verseCount: shortVerses.length,
        totalVerses: filteredVerses.length,
        requiredVerses: 5
      }, { status: 400 });
    }

    // Randomly select verses from the pool (up to poolSize)
    const shuffled = [...shortVerses].sort(() => Math.random() - 0.5);
    const selectedVerses = shuffled.slice(0, Math.min(requestedPoolSize, shortVerses.length));

    // Format verse pool
    const versePool = selectedVerses.map(verse => ({
      ref: `${verse.BibleChapter.number}:${verse.number}`,
      text: verse.text
    }));

    return NextResponse.json({
      success: true,
      versePool,
      totalVerses: versePool.length,
      availableVerses: shortVerses.length,
      message: `Generated ${versePool.length} verses (15 words or less) from passage`
    });

  } catch (error: any) {
    console.error('Error generating verse pool:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate verse pool',
      details: error.toString()
    }, { status: 500 });
  }
}
