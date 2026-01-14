/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../lib/prisma';
import { assignWordToMember } from '../../../../../../lib/wordleGenerator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ wordleId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Admins cannot play' }, { status: 403 });
    }

    const resolvedParams = await params;
    const wordleId = parseInt(resolvedParams.wordleId);
    const { guess } = await request.json();

    // Get or create attempt
    let attempt = await prisma.wordleAttempt.findUnique({
      where: {
        wordleId_memberId: {
          wordleId,
          memberId: decoded.id
        }
      },
      include: {
        WordleInstance: true,
        Member: { include: { Team: true } }
      }
    });

    // If this is first attempt, assign a word from the pool
    if (!attempt) {
      const wordle = await prisma.wordleInstance.findUnique({
        where: { id: wordleId }
      });

      if (!wordle) {
        return NextResponse.json({ error: 'Wordle not found' }, { status: 404 });
      }

      const wordPool: string[] = JSON.parse(wordle.wordPool);

      // Get existing assignments for smart distribution
      const existingAttempts = await prisma.wordleAttempt.findMany({
        where: { wordleId },
        select: { memberId: true, assignedWord: true, Member: { select: { teamId: true } } }
      });

      const assignmentMap = new Map<number, { word: string; teamId: number }>();
      existingAttempts.forEach(a => {
        if (a.Member.teamId !== null) {
          assignmentMap.set(a.memberId, { word: a.assignedWord, teamId: a.Member.teamId });
        }
      });

      // Assign word (strictly avoids giving same word to teammates)
      const assignedWord = assignWordToMember(
        wordPool,
        decoded.teamId,
        decoded.id,
        assignmentMap
      );

      // Create attempt with assigned word
      attempt = await prisma.wordleAttempt.create({
        data: {
          wordleId,
          memberId: decoded.id,
          assignedWord: assignedWord,
          guesses: JSON.stringify([]),
          attempts: 0
        },
        include: {
          WordleInstance: true,
          Member: { include: { Team: true } }
        }
      });
    }

    // Check guess against THIS member's assigned word
    const correctWord = attempt.assignedWord;
    const guessUpper = guess.toUpperCase();

    // Build feedback
    const feedback = [];
    const correctLetters = correctWord.split('');
    const guessLetters = guessUpper.split('');

    // First pass: mark correct positions
    const remainingCorrect = [...correctLetters];
    const remainingGuess = [...guessLetters];

    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === correctLetters[i]) {
        feedback[i] = { letter: guessLetters[i], status: 'correct' };
        remainingCorrect[i] = null as any;
        remainingGuess[i] = null as any;
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
      if (feedback[i]) continue; // Already marked as correct

      const letter = guessLetters[i];
      const indexInRemaining = remainingCorrect.findIndex(l => l === letter);

      if (indexInRemaining !== -1) {
        feedback[i] = { letter, status: 'present' };
        remainingCorrect[indexInRemaining] = null as any;
      } else {
        feedback[i] = { letter, status: 'absent' };
      }
    }

    const isCorrect = guessUpper === correctWord;

    // Update guesses
    const currentGuesses = JSON.parse(attempt.guesses);
    currentGuesses.push(guessUpper);
    
    await prisma.wordleAttempt.update({
      where: { id: attempt.id },
      data: {
        guesses: JSON.stringify(currentGuesses),
        attempts: currentGuesses.length
      }
    });

    return NextResponse.json({
      isCorrect,
      feedback,
      word: isCorrect ? correctWord : undefined // Only reveal on win
    });

  } catch (error: any) {
    console.error('Error checking guess:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}