/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../../lib/jwt';
import { prisma } from '../../../../../../../lib/prisma';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ wordleId: string }> }
) {
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

    // FIX: Await the params - this was the issue!
    const resolvedParams = await params;
    const wordleId = parseInt(resolvedParams.wordleId);
    
    console.log('Attempting to close wordle ID:', wordleId);
    
    if (isNaN(wordleId)) {
      return NextResponse.json({ error: 'Invalid wordle ID' }, { status: 400 });
    }

    // Get wordle details before closing
    const wordle = await prisma.wordleInstance.findUnique({
      where: { id: wordleId },
      include: {
        wordleAttempts: {
          include: {
            member: true
          }
        }
      }
    });

    if (!wordle) {
      return NextResponse.json({ error: 'Wordle not found' }, { status: 404 });
    }

    if (!wordle.isActive) {
      return NextResponse.json({ error: 'Wordle is already closed' }, { status: 400 });
    }

    // Close the wordle
    const updatedWordle = await prisma.wordleInstance.update({
      where: { id: wordleId },
      data: {
        isActive: false
      }
    });

    // Calculate stats for response
    const totalAttempts = wordle.wordleAttempts.length;
    const winCount = wordle.wordleAttempts.filter(attempt => attempt.won).length;
    const uniquePlayers = new Set(wordle.wordleAttempts.map(attempt => attempt.memberId)).size;

    console.log(`✅ Wordle ${wordleId} ("${wordle.word}") closed successfully`);
    
    return NextResponse.json({
      success: true,
      wordle: updatedWordle,
      stats: {
        totalAttempts,
        winCount,
        uniquePlayers,
        winRate: totalAttempts > 0 ? Math.round((winCount / totalAttempts) * 100) : 0
      },
      message: `Wordle "${wordle.title}" closed successfully`
    });

  } catch (error) {
    console.error('Error closing wordle:', error);
    return NextResponse.json({ 
      error: 'Failed to close wordle' 
    }, { status: 500 });
  }
}