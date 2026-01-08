/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../lib/prisma';


// Calculate score based on completion percentage (0-10 points)
function calculateVerseDropScore(
  correctWords: number,
  totalWords: number,
  mistakes: number,
  timeSpent: number,
  timeLimit: number
): number {
  if (totalWords === 0) return 0;

  const completionRate = correctWords / totalWords;

  // Less than 50%: 0 points
  if (completionRate < 0.5) {
    return 0;
  }

  // 50% or more: linear scale from 0-10
  // 50% = 5 points, 100% = 10 points
  const score = Math.round(completionRate * 10);
  
  return Math.max(0, Math.min(10, score));
}

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
    const { gameId } = await params;
    const { correctWords, totalWords, mistakes, timeSpent } = await request.json();

    // Validate input
    if (typeof correctWords !== 'number' || typeof totalWords !== 'number' || 
        typeof mistakes !== 'number' || typeof timeSpent !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid submission data' 
      }, { status: 400 });
    }

    // Find member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id },
      include: { team: true }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get existing attempt
    const existingAttempt = await prisma.verseDropAttempt.findUnique({
      where: { 
        gameId_memberId: { 
          gameId: parseInt(gameId), 
          memberId: member.id 
        } 
      },
      include: {
        game: true
      }
    });

    if (!existingAttempt) {
      return NextResponse.json({ 
        error: 'No active attempt found. Please start playing first.' 
      }, { status: 400 });
    }

    // Check if already completed
    if (existingAttempt.completedAt) {
      return NextResponse.json({ 
        error: 'You have already completed this Verse Drop',
        previousResult: {
          correctWords: existingAttempt.correctWords,
          totalWords: existingAttempt.totalWords,
          mistakes: existingAttempt.mistakes,
          points: existingAttempt.points
        }
      }, { status: 400 });
    }

    // Calculate score
    const points = calculateVerseDropScore(
      correctWords,
      totalWords,
      mistakes,
      timeSpent,
      existingAttempt.game.timeLimit
    );

    // Update attempt record with completion
    await prisma.verseDropAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        correctWords,
        totalWords,
        mistakes,
        timeSpent,
        points,
        completed: true,
        completedAt: new Date()
      }
    });

    // Parse assigned verse
    const assignedVerse = JSON.parse(existingAttempt.assignedVerse);

    // Determine success level
    const accuracyPercent = Math.round((correctWords / totalWords) * 100);
    let message = '';
    if (accuracyPercent === 100 && mistakes === 0) {
      message = `🎉 Perfect! You completed "${assignedVerse.ref}" with no mistakes and earned ${points} points!`;
    } else if (accuracyPercent >= 80) {
      message = `🌟 Great job! You got ${accuracyPercent}% correct and earned ${points} points!`;
    } else if (accuracyPercent >= 60) {
      message = `👍 Good effort! You got ${accuracyPercent}% correct and earned ${points} points!`;
    } else {
      message = `Keep practicing! You earned ${points} points. Try again next time!`;
    }

    return NextResponse.json({
      success: true,
      result: {
        correctWords,
        totalWords,
        mistakes,
        timeSpent,
        points,
        accuracyPercent,
        assignedVerseRef: assignedVerse.ref,
        assignedVerseText: assignedVerse.text,
        message
      }
    });

  } catch (error: any) {
    console.error('Error submitting Verse Drop:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to submit Verse Drop',
      details: error.toString()
    }, { status: 500 });
  }
}
