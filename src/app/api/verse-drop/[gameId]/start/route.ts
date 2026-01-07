/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '../../../../../../lib/prisma';


// Function to assign a verse from the pool, trying to give different verses to same team
function assignVerseToMember(
  versePool: Array<{ ref: string; text: string }>,
  teamId: number,
  memberId: number,
  existingAssignments: Map<number, { verseRef: string; teamId: number }>
): { ref: string; text: string } {
  // Get verses already assigned to THIS SPECIFIC TEAM ONLY
  const teamAssignedVerses = new Set<string>();
  for (const assignment of existingAssignments.values()) {
    if (assignment.teamId === teamId) {
      teamAssignedVerses.add(assignment.verseRef);
    }
  }

  // Try to find a verse not yet assigned to this team
  const unassignedToTeam = versePool.filter(
    verse => !teamAssignedVerses.has(verse.ref)
  );

  if (unassignedToTeam.length > 0) {
    // Pick random from verses not assigned to team
    return unassignedToTeam[Math.floor(Math.random() * unassignedToTeam.length)];
  }

  // If all verses assigned to team, pick random from full pool
  // (This should rarely happen with 30 verses and ~20 members per team)
  return versePool[Math.floor(Math.random() * versePool.length)];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
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
    const gameId = parseInt(resolvedParams.gameId);

    // Check if user already has an attempt for this game
    let attempt = await prisma.verseDropAttempt.findUnique({
      where: {
        gameId_memberId: {
          gameId,
          memberId: decoded.id
        }
      },
      include: {
        game: true,
        member: { include: { team: true } }
      }
    });

    // If attempt already exists, return their assigned verse
    if (attempt) {
      const assignedVerse = JSON.parse(attempt.assignedVerse);
      return NextResponse.json({
        success: true,
        attempt: {
          id: attempt.id,
          assignedVerseRef: assignedVerse.ref,
          assignedVerseText: assignedVerse.text,
          timeLimit: attempt.game.timeLimit,
          alreadyStarted: true
        }
      });
    }

    // Get the game
    const game = await prisma.verseDropGame.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.isActive) {
      return NextResponse.json({ error: 'This game is no longer active' }, { status: 400 });
    }

    const versePool: Array<{ ref: string; text: string }> = JSON.parse(game.versePool);

    // Get existing assignments for smart distribution
    const existingAttempts = await prisma.verseDropAttempt.findMany({
      where: { gameId },
      select: { 
        memberId: true, 
        assignedVerse: true,
        member: { select: { teamId: true } }
      }
    });

    const assignmentMap = new Map<number, { verseRef: string; teamId: number }>();
    existingAttempts.forEach(a => {
      if (a.member.teamId !== null) {
        const verse = JSON.parse(a.assignedVerse);
        assignmentMap.set(a.memberId, { verseRef: verse.ref, teamId: a.member.teamId });
      }
    });

    // Assign verse (strictly avoids giving same verse to teammates)
    const assignedVerse = assignVerseToMember(
      versePool,
      decoded.teamId,
      decoded.id,
      assignmentMap
    );

    // Create or get existing attempt with assigned verse (using upsert to prevent race conditions)
    attempt = await prisma.verseDropAttempt.upsert({
      where: {
        gameId_memberId: {
          gameId,
          memberId: decoded.id
        }
      },
      create: {
        gameId,
        memberId: decoded.id,
        assignedVerse: JSON.stringify(assignedVerse),
        correctWords: 0,
        totalWords: 0,
        mistakes: 0,
        timeSpent: 0,
        points: 0
      },
      update: {},
      include: {
        game: true,
        member: { include: { team: true } }
      }
    });

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        assignedVerseRef: assignedVerse.ref,
        assignedVerseText: assignedVerse.text,
        timeLimit: game.timeLimit,
        alreadyStarted: false
      }
    });

  } catch (error: any) {
    console.error('Error starting Verse Drop:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to start game',
      details: error.toString()
    }, { status: 500 });
  }
}
