/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../../lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
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

    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.gameId);

    // Close the game
    const closedGame = await prisma.emojiGame.update({
      where: { id: gameId },
      data: { isActive: false },
      include: {
        book: true,
        emojiAttempts: {
          include: {
            member: {
              include: { team: true }
            }
          }
        }
      }
    });

    // Get stats
    const totalAttempts = closedGame.emojiAttempts.length;
    const completedAttempts = closedGame.emojiAttempts.filter(a => a.completed).length;
    const correctAnswers = closedGame.emojiAttempts.filter(a => a.isCorrect).length;
    const totalPoints = closedGame.emojiAttempts.reduce((sum, a) => sum + a.points, 0);

    console.log(`📱 Emoji Game ${gameId} closed. ${completedAttempts}/${totalAttempts} completed, ${correctAnswers} correct`);

    return NextResponse.json({
      success: true,
      message: `Emoji game "${closedGame.title}" closed successfully`,
      stats: {
        totalAttempts,
        completedAttempts,
        correctAnswers,
        totalPoints,
        successRate: totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0
      }
    });

  } catch (error: any) {
    console.error('Error closing emoji game:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}