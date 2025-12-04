/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../lib/jwt';
import { prisma } from '../../../../../lib/prisma';


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

    // Get active Wordle
    const activeWordle = await prisma.wordleInstance.findFirst({
      where: { isActive: true },
      include: { 
        book: true,
        wordleAttempts: {
          where: { memberId: member.id }
        }
      }
    });

    if (!activeWordle) {
      return NextResponse.json({ wordle: null, message: 'No active Wordle today' });
    }

    // Check if member already played today
    const hasPlayed = activeWordle.wordleAttempts.length > 0;

    if (hasPlayed) {
      return NextResponse.json({ 
        wordle: null, 
        hasPlayed: true,
        message: 'You already played today! Check back tomorrow for a new Wordle.' 
      });
    }

    // Return wordle without the answer word
    return NextResponse.json({
      wordle: {
        id: activeWordle.id,
        title: activeWordle.title,
        hint: activeWordle.hint,
        book: activeWordle.book.name
      },
      hasPlayed: false
    });

  } catch (error: any) {
    console.error('Error fetching available Wordle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}