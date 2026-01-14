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
    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse, versePairs } = body;

    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate verse pairs pool
    if (!versePairs || !Array.isArray(versePairs) || versePairs.length < 8) {
      return NextResponse.json(
        { error: 'Verse pairs pool must contain at least 8 pairs' },
        { status: 400 }
      );
    }

    // Get book info
    const book = await prisma.bibleBook.findUnique({
      where: { id: parseInt(bookId) },
    });

    if (!book) {
      return NextResponse.json({ error: 'Bible book not found' }, { status: 404 });
    }

    // Close any existing active flip games
    await prisma.flipGame.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new flip game with the verse pairs pool
    const newGame = await prisma.flipGame.create({
      data: {
        title,
        verseData: JSON.stringify(versePairs), // Store the full pool
        bookId: parseInt(bookId),
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        timeLimit: 240, // No longer used but kept for compatibility
        isActive: true,
        adminId: decoded.id,
      },
    });

    return NextResponse.json({
      success: true,
      game: newGame,
      versePairs, // Return for admin preview
      message: `Flip game created with ${versePairs.length} verse pairs from ${book.name} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}!`,
      pairCount: versePairs.length,
    });
  } catch (error: any) {
    console.error('Error creating flip game:', error);
    return NextResponse.json(
      { error: 'Failed to create flip game' },
      { status: 500 }
    );
  }
}
