/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { generateWordlePoolFromScripture, validatePassageForWordle } from '../../../../../../lib/wordleGenerator';
import { NextResponse } from 'next/server';

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
    const requestedPoolSize = poolSize ? parseInt(poolSize) : 12;

    // Validate passage has enough words (minimum 10, but we prefer more)
    const validation = await validatePassageForWordle(
      parsedBookId,
      parsedFromChapter,
      parsedFromVerse,
      parsedToChapter,
      parsedToVerse,
      requestedPoolSize
    );

    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.message || 'Passage does not have enough 5-letter words',
        wordCount: validation.wordCount,
        requiredWords: 10 // Show the actual minimum
      }, { status: 400 });
    }

    // Generate new word pool - use available words (may be less than requested)
    const actualPoolSize = Math.min(requestedPoolSize, validation.wordCount);
    const newWordPool = await generateWordlePoolFromScripture(
      parsedBookId,
      parsedFromChapter,
      parsedFromVerse,
      parsedToChapter,
      parsedToVerse,
      actualPoolSize
    );

    return NextResponse.json({
      success: true,
      wordPool: newWordPool,
      totalWords: newWordPool.length,
      availableWords: validation.wordCount,
      message: `Generated ${newWordPool.length} new words from passage`
    });

  } catch (error: any) {
    console.error('Error regenerating word pool:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to regenerate word pool',
      details: error.toString()
    }, { status: 500 });
  }
}