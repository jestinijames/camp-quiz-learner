/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../lib/prisma';


export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    // Find the current member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get active Verse Drop that the user hasn't completed
    const activeGame = await prisma.verseDropGame.findFirst({
      where: { 
        isActive: true,
        NOT: {
          verseDropAttempts: {
            some: {
              memberId: member.id,
              completedAt: {
                not: null
              }
            }
          }
        }
      },
      include: { 
        book: true
      },
      orderBy: {
        createdDate: 'desc'
      }
    });

    if (!activeGame) {
      return NextResponse.json({ 
        available: false,
        message: 'No Verse Drop games available right now'
      });
    }

    // Return game info without the verse pool (they'll get a random verse when they start)
    return NextResponse.json({
      available: true,
      game: {
        id: activeGame.id,
        title: activeGame.title,
        book: activeGame.book.name,
        fromChapter: activeGame.fromChapter,
        fromVerse: activeGame.fromVerse,
        toChapter: activeGame.toChapter,
        toVerse: activeGame.toVerse,
        timeLimit: activeGame.timeLimit
      }
    });

  } catch (error: any) {
    console.error('Error fetching available Verse Drop:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Verse Drop game' 
    }, { status: 500 });
  }
}
