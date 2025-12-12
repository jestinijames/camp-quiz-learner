/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { generateWordlePoolFromScripture, validatePassageForWordle } from '../../../../../../lib/wordleGenerator';
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

    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse, hint } = await request.json();

    // Validate input
    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedBookId = parseInt(bookId);
    const parsedFromChapter = parseInt(fromChapter);
    const parsedFromVerse = parseInt(fromVerse);
    const parsedToChapter = parseInt(toChapter);
    const parsedToVerse = parseInt(toVerse);

    // Validate passage has enough words
    const validation = await validatePassageForWordle(
      parsedBookId,
      parsedFromChapter,
      parsedFromVerse,
      parsedToChapter,
      parsedToVerse,
      12 // Need at least 12 words for pool
    );

    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.message || 'Passage does not have enough 5-letter words',
        wordCount: validation.wordCount
      }, { status: 400 });
    }

    // Generate word pool from scripture (12 different words)
    const wordPool = await generateWordlePoolFromScripture(
      parsedBookId,
      parsedFromChapter,
      parsedFromVerse,
      parsedToChapter,
      parsedToVerse,
      12 // Generate 12 different words
    );

    console.log(`Generated word pool with ${wordPool.length} words:`, wordPool);

    // Get book info for hint
    const book = await prisma.bibleBook.findUnique({
      where: { id: parsedBookId }
    });

    // Deactivate any existing active Wordle
    await prisma.wordleInstance.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new Wordle with word pool
    const wordle = await prisma.wordleInstance.create({
      data: {
        title,
        wordPool: JSON.stringify(wordPool), // Store as JSON array
        bookId: parsedBookId,
        fromChapter: parsedFromChapter,
        fromVerse: parsedFromVerse,
        toChapter: parsedToChapter,
        toVerse: parsedToVerse,
        hint: hint || `From ${book?.name} ${parsedFromChapter}:${parsedFromVerse}-${parsedToChapter}:${parsedToVerse}`,
        adminId: decoded.id,
        isActive: true
      },
      include: {
        book: true
      }
    });

    return NextResponse.json({
      success: true,
      wordle: {
        ...wordle,
        wordPool: wordPool // Send back for admin preview
      },
      message: `Daily Wordle created with ${wordPool.length} different words!`,
      wordCount: validation.wordCount
    });

  } catch (error: any) {
    console.error('Error creating Wordle:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create Wordle',
      details: error.toString()
    }, { status: 500 });
  }
}