/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { prisma } from '../../../../../../lib/prisma';
import { calculateWordleScore } from '../../../../../../lib/wordleGenerator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ wordleId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    const { wordleId } = await params;
    const { guesses, won, timeSpent } = await request.json();

    // Find member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id },
      include: { team: true }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get existing attempt (should exist from the check endpoint)
    const existingAttempt = await prisma.wordleAttempt.findUnique({
      where: { 
        wordleId_memberId: { 
          wordleId: parseInt(wordleId), 
          memberId: member.id 
        } 
      }
    });

    if (!existingAttempt) {
      return NextResponse.json({ 
        error: 'No active attempt found. Please start playing first.' 
      }, { status: 400 });
    }

    // Check if already completed
    if (existingAttempt.completed) {
      return NextResponse.json({ 
        error: 'You have already completed this Wordle',
        previousResult: {
          won: existingAttempt.won,
          attempts: existingAttempt.attempts,
          points: existingAttempt.points,
          correctWord: existingAttempt.assignedWord
        }
      }, { status: 400 });
    }

    // FIXED: Check guesses against THEIR assigned word (not a single word)
    const assignedWord = existingAttempt.assignedWord.toUpperCase();
    const actuallyWon = guesses.some((guess: string) => guess.toUpperCase() === assignedWord);
    const attempts = actuallyWon 
      ? guesses.findIndex((guess: string) => guess.toUpperCase() === assignedWord) + 1
      : guesses.length;

    // Calculate score
    const points = calculateWordleScore(attempts, actuallyWon);

    // Update attempt record with completion
    const updatedAttempt = await prisma.wordleAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        guesses: JSON.stringify(guesses),
        completed: true,
        won: actuallyWon,
        attempts,
        timeSpent,
        points,
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      result: {
        won: actuallyWon,
        attempts,
        points,
        correctWord: assignedWord, // Return THEIR assigned word
        message: actuallyWon ? 
          `🎉 Congratulations! You got "${assignedWord}" in ${attempts} attempt${attempts > 1 ? 's' : ''} and earned ${points} points!` :
          `Good try! Your word was "${assignedWord}". You earned ${points} participation point${points > 1 ? 's' : ''}.`
      }
    });

  } catch (error: any) {
    console.error('Error submitting Wordle:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to submit Wordle',
      details: error.toString()
    }, { status: 500 });
  }
}