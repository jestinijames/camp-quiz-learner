/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/emoji/[gameId]/submit/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';

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
    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.gameId);

    const body = await request.json();
    const { answer, timeSpent } = body;

    if (!answer) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    // Normalize answer format (remove spaces, ensure format)
    const normalizedAnswer = answer.trim().replace(/\s+/g, '');
    
    // Validate format: chapter:verse
    const formatRegex = /^\d+:\d+$/;
    if (!formatRegex.test(normalizedAnswer)) {
      return NextResponse.json({ 
        error: 'Invalid format. Use chapter:verse (e.g., 3:16)' 
      }, { status: 400 });
    }

    // Get the attempt
    const attempt = await prisma.emojiAttempt.findUnique({
      where: {
        gameId_memberId: {
          gameId: gameId,
          memberId: decoded.id
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.completed) {
      return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
    }

    // Parse the assigned puzzle
    const assignedPuzzle = JSON.parse(attempt.assignedEmoji);
    const correctAnswer = assignedPuzzle.verse;

    // Check if correct
    const isCorrect = normalizedAnswer === correctAnswer;
    
    // Award points: 10 for correct, 0 for wrong
    const points = isCorrect ? 10 : 0;

    // Update attempt
    const updatedAttempt = await prisma.emojiAttempt.update({
      where: { id: attempt.id },
      data: {
        answer: normalizedAnswer,
        isCorrect,
        completed: true,
        points,
        timeSpent: timeSpent || null,
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      isCorrect,
      points,
      correctAnswer,
      assignedEmoji: assignedPuzzle,
      attempt: updatedAttempt
    });

  } catch (error: any) {
    console.error('Error submitting emoji answer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}