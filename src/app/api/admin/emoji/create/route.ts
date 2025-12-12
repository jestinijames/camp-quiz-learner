/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/emoji/create/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';
import { generateEmojiPuzzles } from '../../../../../../lib/emojiGenerator';

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
    const { title, bookId, fromChapter, fromVerse, toChapter, toVerse, hint } = body;

    // Validate inputs
    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`📱 Creating Emoji Game: ${title}`);

    // Fetch verses from the passage
    const verses = await prisma.bibleVerse.findMany({
      where: {
        chapter: {
          book: { id: bookId },
          number: {
            gte: fromChapter,
            lte: toChapter
          }
        },
        number: {
          gte: fromChapter === toChapter ? fromVerse : (chapter: any) => chapter.number === fromChapter ? fromVerse : 1,
          lte: fromChapter === toChapter ? toVerse : (chapter: any) => chapter.number === toChapter ? toVerse : 999
        }
      },
      include: {
        chapter: {
          include: { book: true }
        }
      },
      orderBy: [
        { chapter: { number: 'asc' } },
        { number: 'asc' }
      ]
    });

    if (verses.length === 0) {
      return NextResponse.json({ error: 'No verses found in range' }, { status: 404 });
    }

    const book = verses[0].chapter.book;
    
    // Format verses for AI
    const verseData = verses.map(v => ({
      chapter: v.chapter.number,
      verse: v.number,
      text: v.text
    }));

    // Generate emoji puzzles
    const puzzles = await generateEmojiPuzzles(
      book.name,
      fromChapter,
      fromVerse,
      toChapter,
      toVerse,
      verseData
    );

    // Create emoji game
    const emojiGame = await prisma.emojiGame.create({
      data: {
        title,
        emojiPool: JSON.stringify(puzzles),
        bookId,
        fromChapter,
        fromVerse,
        toChapter,
        toVerse,
        hint: hint || null,
        adminId: decoded.id
      },
      include: {
        book: true
      }
    });

    console.log(`✅ Emoji Game created with ${puzzles.length} puzzles`);

    return NextResponse.json({
      success: true,
      game: {
        id: emojiGame.id,
        title: emojiGame.title,
        puzzleCount: puzzles.length,
        book: emojiGame.book.name,
        passage: `${fromChapter}:${fromVerse}-${toChapter}:${toVerse}`
      },
      puzzles // Return puzzles for preview
    });

  } catch (error: any) {
    console.error('❌ Error creating emoji game:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create emoji game' 
    }, { status: 500 });
  }
}