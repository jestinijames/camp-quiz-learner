/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';


export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;

    const body = await request.json();
    const { gameId, pairsMatched, moves, timeSpent, completed, won } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Check if game exists and is active
    const game = await prisma.flipGame.findUnique({
      where: { id: gameId },
    });

    if (!game || !game.isActive) {
      return NextResponse.json({ error: 'Game not found or inactive' }, { status: 404 });
    }

    // Check for existing attempt
    const existingAttempt = await prisma.flipAttempt.findUnique({
      where: {
        gameId_memberId: {
          gameId,
          memberId: decoded.id,
        },
      },
    });

    if (existingAttempt?.completed) {
      return NextResponse.json(
        { error: 'You have already completed this game' },
        { status: 400 }
      );
    }

    // Calculate points based on pairs matched (1.25 points per pair, max 10 points)
    // Each pair = 10% of total = 1.25 points
    const pointsPerPair = 1.25;
    const points = Math.round(pairsMatched * pointsPerPair * 100) / 100; // Round to 2 decimals

    // Create or update attempt
    const attempt = await prisma.flipAttempt.upsert({
      where: {
        gameId_memberId: {
          gameId,
          memberId: decoded.id,
        },
      },
      create: {
        gameId,
        memberId: decoded.id,
        pairsMatched,
        totalPairs: 8,
        moves,
        completed,
        won,
        timeSpent,
        completedAt: completed ? new Date() : null,
        points,
      },
      update: {
        pairsMatched,
        moves,
        completed,
        won,
        timeSpent,
        completedAt: completed ? new Date() : null,
        points,
      },
    });

    return NextResponse.json({
      success: true,
      attempt,
      points,
    });
  } catch (error: any) {
    console.error('Error completing flip game:', error);
    return NextResponse.json(
      { error: 'Failed to complete flip game' },
      { status: 500 }
    );
  }
}
