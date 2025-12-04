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

    // Get Wordle instance
    const wordle = await prisma.wordleInstance.findUnique({
      where: { id: parseInt(wordleId) }
    });

    if (!wordle) {
      return NextResponse.json({ error: 'Wordle not found' }, { status: 404 });
    }

    // Check if already submitted
    const existingAttempt = await prisma.wordleAttempt.findUnique({
      where: { 
        wordleId_memberId: { 
          wordleId: parseInt(wordleId), 
          memberId: member.id 
        } 
      }
    });

    if (existingAttempt) {
      return NextResponse.json({ error: 'Already submitted today' }, { status: 400 });
    }

    // FIXED: Determine if they actually won by checking their guesses against the actual word
    const actualWord = wordle.word.toUpperCase();
    const actuallyWon = guesses.some((guess: string) => guess.toUpperCase() === actualWord);
    const attempts = actuallyWon 
      ? guesses.findIndex((guess: string) => guess.toUpperCase() === actualWord) + 1
      : guesses.length;

    // Calculate score
    const points = calculateWordleScore(attempts, actuallyWon);

    // Create attempt record
    const wordleAttempt = await prisma.wordleAttempt.create({
      data: {
        wordleId: parseInt(wordleId),
        memberId: member.id,
        guesses: JSON.stringify(guesses),
        completed: true,
        won: actuallyWon, // Use actual win status
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
        correctWord: actualWord, // Always return the correct word
        message: actuallyWon ? 
          `Congratulations! You got it in ${attempts} attempts and earned ${points} points!` :
          `Good try! The word was "${actualWord}". You earned ${points} participation point${points > 1 ? 's' : ''}.`
      }
    });

  } catch (error: any) {
    console.error('Error submitting Wordle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}