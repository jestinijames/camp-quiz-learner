import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallSessionId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallSessionId } = await params;

    // Get the current member's team
    const member = await prisma.member.findUnique({
      where: { id: decoded.id },
      select: { teamId: true }
    });

    if (!member?.teamId) {
      return NextResponse.json({ error: 'Member not assigned to a team' }, { status: 400 });
    }

    // Fetch only cards from members in the same team
    const cards = await prisma.collaborationCard.findMany({
      where: {
        wallSessionId: parseInt(wallSessionId),
        content: {
          notIn: ['__LISTENING_COMPLETION__', '__LISTENING_SKIPPED__'] // Exclude all marker cards
        },
        Member: {
          teamId: member.teamId // Fetch only cards from same team
        }
      },
      include: {
        Member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    console.log(`[Collaboration Cards] Wall ${wallSessionId}, Team ${member.teamId}: Fetched ${cards.length} cards`);
    
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching collaboration cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration cards' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wallSessionId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallSessionId } = await params;
    const { content, color, positionX, positionY, quizSessionId, isFirstSubmission } = await request.json();

    if (!content || !color) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if this is a first submission for points
    let shouldAwardPoints = false;
    if (isFirstSubmission) {
      // Check if user has already received points for this wall session
      const existingPointCard = await prisma.collaborationCard.findFirst({
        where: {
          wallSessionId: parseInt(wallSessionId),
          authorId: decoded.id,
          pointsAwarded: true
        }
      });

      // Only award points if they haven't received them before
      shouldAwardPoints = !existingPointCard;
    }

    // Generate unique ID using timestamp + random for better compatibility
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const card = await prisma.collaborationCard.create({
      data: {
        id: uniqueId,
        wallSessionId: parseInt(wallSessionId),
        authorId: decoded.id,
        content,
        color,
        positionX: positionX ?? 0,
        positionY: positionY ?? 0,
        quizSessionId: quizSessionId || null,
        pointsAwarded: shouldAwardPoints,
        updatedAt: new Date(),
      },
      include: {
        Member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            Team: {
              select: {
                id: true,
                name: true
              }
            }
          },
        },
      },
    });

    // Award points to the team if applicable
    let pointsMessage = '';
    if (shouldAwardPoints && card.Member.Team) {
      pointsMessage = `+2 points awarded to ${card.Member.Team.name}!`;
    }

    return NextResponse.json({ 
      card, 
      pointsAwarded: shouldAwardPoints,
      message: pointsMessage 
    });
  } catch (error) {
    console.error('Error creating collaboration card:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration card' },
      { status: 500 }
    );
  }
}
