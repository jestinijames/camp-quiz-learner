/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { generateWordleFromScripture } from '../../../../../../lib/wordleGenerator';
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

    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse } = await request.json();

    // Validate input
    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate word from scripture
    const word = await generateWordleFromScripture(
      parseInt(bookId), 
      parseInt(fromChapter), 
      parseInt(fromVerse), 
      parseInt(toChapter), 
      parseInt(toVerse)
    );

    // Get book info for hint
    const book = await prisma.bibleBook.findUnique({
      where: { id: parseInt(bookId) }
    });

    // Deactivate any existing active Wordle
    await prisma.wordleInstance.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new Wordle
    const wordle = await prisma.wordleInstance.create({
      data: {
        title,
        word: word.toUpperCase(),
        bookId: parseInt(bookId),
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        hint: `From ${book?.name} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}`,
        adminId: decoded.id
      },
      include: {
        book: true
      }
    });

    return NextResponse.json({
      success: true,
      wordle,
      message: `Daily Wordle created! Word: ${word}`
    });

  } catch (error: any) {
    console.error('Error creating Wordle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}