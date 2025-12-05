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

    // Get active Wordle that the user hasn't completed
    const activeWordle = await prisma.wordleInstance.findFirst({
      where: { 
        isActive: true,
        NOT: {
          wordleAttempts: {
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

    if (!activeWordle) {
      return NextResponse.json({ 
        available: false,
        message: 'No wordle games available right now'
      });
    }

    // Return wordle without the answer word
    return NextResponse.json({
      available: true,
      wordle: {
        id: activeWordle.id,
        title: activeWordle.title,
        hint: activeWordle.hint,
        book: activeWordle.book.name
        // Don't send the actual word!
      }
    });

  } catch (error: any) {
    console.error('Error fetching available Wordle:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch wordle' 
    }, { status: 500 });
  }
}