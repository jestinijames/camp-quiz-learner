/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

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
    const { guess } = await request.json();

    // Find member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
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

    const actualWord = wordle.word.toUpperCase();
    const guessWord = guess.toUpperCase();
    
    // Check if guess is correct
    const isCorrect = guessWord === actualWord;
    
    // Generate feedback for each letter
    const feedback = [];
    for (let i = 0; i < 5; i++) {
      const letter = guessWord[i];
      if (actualWord[i] === letter) {
        feedback.push({ letter, status: 'correct' });
      } else if (actualWord.includes(letter)) {
        feedback.push({ letter, status: 'present' });
      } else {
        feedback.push({ letter, status: 'absent' });
      }
    }

    return NextResponse.json({
      isCorrect,
      feedback,
      // Don't reveal the word unless they got it right
      word: isCorrect ? actualWord : null
    });

  } catch (error: any) {
    console.error('Error checking guess:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}