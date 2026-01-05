/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/emoji/[gameId]/start/route.ts
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
    
    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Admins cannot play games' }, { status: 403 });
    }

    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.gameId);

    // Get the game
    const game = await prisma.emojiGame.findUnique({
      where: { id: gameId },
      include: { book: true }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.isActive) {
      return NextResponse.json({ error: 'Game is no longer active' }, { status: 400 });
    }

    // Check if member already has an attempt
    const existingAttempt = await prisma.emojiAttempt.findUnique({
      where: {
        gameId_memberId: {
          gameId: gameId,
          memberId: decoded.id
        }
      }
    });

    if (existingAttempt?.completed) {
      // If already completed, return the completed attempt
      return NextResponse.json({
        attempt: existingAttempt,
        game: {
          id: game.id,
          title: game.title,
          bookName: game.book.name,
          hint: game.hint
        }
      });
    }

    // If there's an incomplete attempt, delete it and start fresh
    if (existingAttempt && !existingAttempt.completed) {
      await prisma.emojiAttempt.delete({
        where: { id: existingAttempt.id }
      });
    }

    // Parse the emoji pool
    const puzzlePool = JSON.parse(game.emojiPool);
    
    // Randomly select one puzzle for this member
    const randomIndex = Math.floor(Math.random() * puzzlePool.length);
    const assignedPuzzle = puzzlePool[randomIndex];

    // Create new attempt
    const attempt = await prisma.emojiAttempt.create({
      data: {
        gameId: gameId,
        memberId: decoded.id,
        assignedEmoji: JSON.stringify(assignedPuzzle)
      }
    });

    return NextResponse.json({
      attempt,
      game: {
        id: game.id,
        title: game.title,
        bookName: game.book.name,
        hint: game.hint
      }
    });

  } catch (error: any) {
    console.error('Error starting emoji game:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}