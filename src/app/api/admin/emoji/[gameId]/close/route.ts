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
        BibleBook: true,
        EmojiAttempt: {
          include: {
            Member: {
              include: { Team: true }
            }
          }
        }
      }
    });

    // Get stats
    const totalAttempts = closedGame.EmojiAttempt.length;
    const completedAttempts = closedGame.EmojiAttempt.filter((a: { completed: boolean }) => a.completed).length;
    const correctAnswers = closedGame.EmojiAttempt.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
    const totalPoints = closedGame.EmojiAttempt.reduce((sum: number, a: { points: number }) => sum + a.points, 0);

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