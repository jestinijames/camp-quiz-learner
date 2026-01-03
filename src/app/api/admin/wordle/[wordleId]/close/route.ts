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

    const resolvedParams = await params;
    const wordleId = parseInt(resolvedParams.wordleId);
    
    if (isNaN(wordleId)) {
      return NextResponse.json({ error: 'Invalid wordle ID' }, { status: 400 });
    }

    // Get wordle details before closing
    const wordle = await prisma.wordleInstance.findUnique({
      where: { id: wordleId },
      include: {
        book: true,
        wordleAttempts: {
          include: {
            member: {
              include: { team: true }
            }
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

    // Parse word pool to show what words were used
    let wordPool: string[] = [];
    try {
      wordPool = JSON.parse(wordle.wordPool);
    } catch (error) {
      console.error('Error parsing word pool:', error);
      wordPool = [];
    }

    // Close the wordle
    const updatedWordle = await prisma.wordleInstance.update({
      where: { id: wordleId },
      data: {
        isActive: false
      }
    });

    // Calculate detailed stats
    const totalAttempts = wordle.wordleAttempts.length;
    const completedAttempts = wordle.wordleAttempts.filter(a => a.completed).length;
    const winCount = wordle.wordleAttempts.filter(a => a.won).length;
    const uniquePlayers = new Set(wordle.wordleAttempts.map(a => a.memberId)).size;

    // Calculate word distribution (how many players got each word)
    const wordDistribution: { [word: string]: number } = {};
    wordle.wordleAttempts.forEach(attempt => {
      const word = attempt.assignedWord;
      wordDistribution[word] = (wordDistribution[word] || 0) + 1;
    });

    // Calculate average attempts for winners
    const winnerAttempts = wordle.wordleAttempts
      .filter(a => a.won)
      .map(a => a.attempts);
    const avgAttempts = winnerAttempts.length > 0
      ? Math.round((winnerAttempts.reduce((sum, a) => sum + a, 0) / winnerAttempts.length) * 10) / 10
      : 0;

    // Get top performers
    const topPerformers = wordle.wordleAttempts
      .filter(a => a.won)
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, 5)
      .map(a => ({
        memberName: a.member.firstName,
        teamName: a.member.team.name,
        attempts: a.attempts,
        word: a.assignedWord
      }));
    
    return NextResponse.json({
      success: true,
      wordle: {
        ...updatedWordle,
        wordPool: wordPool // Include word pool in response
      },
      stats: {
        totalAttempts,
        completedAttempts,
        winCount,
        uniquePlayers,
        winRate: completedAttempts > 0 
          ? Math.round((winCount / completedAttempts) * 100) 
          : 0,
        avgAttempts,
        wordPool: wordPool,
        wordPoolSize: wordPool.length,
        wordDistribution,
        topPerformers,
        reference: `${wordle.book.name} ${wordle.fromChapter}:${wordle.fromVerse}-${wordle.toChapter}:${wordle.toVerse}`
      },
      message: `Wordle "${wordle.title}" closed successfully. ${uniquePlayers} players participated with ${wordPool.length} different words.`
    });

  } catch (error) {
    console.error('Error closing wordle:', error);
    return NextResponse.json({ 
      error: 'Failed to close wordle',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}