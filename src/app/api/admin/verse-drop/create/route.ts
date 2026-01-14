/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
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

    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse, versePool, timeLimit } = await request.json();

    // Validate input
    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse || !versePool) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(versePool) || versePool.length < 10) {
      return NextResponse.json({ 
        error: 'Verse pool must contain at least 10 verses',
        poolSize: versePool?.length || 0
      }, { status: 400 });
    }

    const parsedBookId = parseInt(bookId);
    const parsedFromChapter = parseInt(fromChapter);
    const parsedFromVerse = parseInt(fromVerse);
    const parsedToChapter = parseInt(toChapter);
    const parsedToVerse = parseInt(toVerse);
    const parsedTimeLimit = timeLimit ? parseInt(timeLimit) : 240; // Default 4 minutes

    // Get book info
    const book = await prisma.bibleBook.findUnique({
      where: { id: parsedBookId }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Deactivate any existing active Verse Drop
    await prisma.verseDropGame.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new Verse Drop with verse pool
    const verseDropGame = await prisma.verseDropGame.create({
      data: {
        title,
        versePool: JSON.stringify(versePool), // Store as JSON array
        bookId: parsedBookId,
        fromChapter: parsedFromChapter,
        fromVerse: parsedFromVerse,
        toChapter: parsedToChapter,
        toVerse: parsedToVerse,
        timeLimit: parsedTimeLimit,
        adminId: decoded.id,
        isActive: true
      },
      include: {
        BibleBook: true
      }
    });

    return NextResponse.json({
      success: true,
      verseDropGame: {
        ...verseDropGame,
        versePool: versePool // Send back for admin preview
      },
      message: `Verse Drop created with ${versePool.length} verses from ${book.name} ${parsedFromChapter}:${parsedFromVerse}-${parsedToChapter}:${parsedToVerse}!`,
      poolSize: versePool.length
    });

  } catch (error) {
    console.error('Error creating Verse Drop:', error);
    return NextResponse.json(
      { error: 'Failed to create Verse Drop game' },
      { status: 500 }
    );
  }
}
