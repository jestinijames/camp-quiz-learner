/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/emoji/available/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    if (decoded.isAdmin) {
      return NextResponse.json({ games: [] });
    }

    // Get active emoji games that the user hasn't completed
    const activeGames = await prisma.emojiGame.findMany({
      where: { 
        isActive: true,
        NOT: {
          EmojiAttempt: {
            some: {
              memberId: decoded.id,
              completed: true
            }
          }
        }
      },
      include: {
        BibleBook: true
      },
      orderBy: { createdDate: 'desc' }
    });

    const games = activeGames.map(game => ({
      id: game.id,
      title: game.title,
      bookName: game.BibleBook.name,
      passage: `${game.fromChapter}:${game.fromVerse}-${game.toChapter}:${game.toVerse}`,
      hint: game.hint,
      createdDate: game.createdDate
    }));

    return NextResponse.json({ games });

  } catch (error: any) {
    console.error('Error fetching available emoji games:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}