/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/emoji/[gameId]/start/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';
import { assignEmojiToMember } from '../../../../../../lib/emojiGenerator';

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
      include: { BibleBook: true }
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
          bookName: game.BibleBook.name,
          hint: game.hint
        }
      });
    }

    // If there's an incomplete attempt, delete it and start fresh
    if (existingAttempt && !existingAttempt.completed) {
      try {
        await prisma.emojiAttempt.delete({
          where: { id: existingAttempt.id }
        });
      } catch (error: any) {
        // If record not found, it was already deleted by another request - continue
        if (error.code !== 'P2025') {
          throw error;
        }
      }
    }

    // Parse the emoji pool
    const puzzlePool = JSON.parse(game.emojiPool);
    
    // Get existing assignments for smart distribution
    const existingAttempts = await prisma.emojiAttempt.findMany({
      where: { gameId },
      select: { memberId: true, assignedEmoji: true, Member: { select: { teamId: true } } }
    });

    const assignmentMap = new Map<number, { emoji: any; teamId: number }>();
    existingAttempts.forEach(a => {
      if (a.Member.teamId !== null) {
        assignmentMap.set(a.memberId, { 
          emoji: JSON.parse(a.assignedEmoji),
          teamId: a.Member.teamId
        });
      }
    });

    // Assign emoji puzzle (strictly avoids giving same puzzle to teammates)
    const assignedPuzzle = assignEmojiToMember(
      puzzlePool,
      decoded.teamId,
      decoded.id,
      assignmentMap
    );

    // Create new attempt with error handling for race conditions
    let attempt;
    try {
      attempt = await prisma.emojiAttempt.create({
        data: {
          gameId: gameId,
          memberId: decoded.id,
          assignedEmoji: JSON.stringify(assignedPuzzle)
        }
      });
    } catch (error: any) {
      // If unique constraint failed, another request created it - fetch it
      if (error.code === 'P2002') {
        attempt = await prisma.emojiAttempt.findUnique({
          where: {
            gameId_memberId: {
              gameId: gameId,
              memberId: decoded.id
            }
          }
        });
        
        // If it was completed in the meantime, return it
        if (attempt?.completed) {
          return NextResponse.json({
            attempt,
            game: {
              id: game.id,
              title: game.title,
              bookName: game.BibleBook.name,
              hint: game.hint
            }
          });
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      attempt,
      game: {
        id: game.id,
        title: game.title,
        bookName: game.BibleBook.name,
        hint: game.hint
      }
    });

  } catch (error: any) {
    console.error('Error starting emoji game:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}