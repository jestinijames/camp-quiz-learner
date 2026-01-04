import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '../../../../../../lib/prisma';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wallSessionId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as { id: number; isAdmin: boolean };
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallSessionId } = await params;
    const wallId = parseInt(wallSessionId);

    // Check if wall session exists and is active
    const wallSession = await prisma.collaborationWallSession.findUnique({
      where: { id: wallId },
    });

    if (!wallSession) {
      return NextResponse.json({ error: 'Wall session not found' }, { status: 404 });
    }

    if (!wallSession.isActive) {
      return NextResponse.json({ error: 'Wall session is not active' }, { status: 400 });
    }

    // Check if user has already received points for listening to this wall
    const existingListenRecord = await prisma.collaborationCard.findFirst({
      where: {
        wallSessionId: wallId,
        authorId: decoded.id,
        content: '__LISTENING_COMPLETION__', // Special marker for listening completion
      },
    });

    if (existingListenRecord) {
      return NextResponse.json(
        { error: 'Points already awarded for listening to this passage', alreadyAwarded: true },
        { status: 200 }
      );
    }

    const pointsAwarded = 4;

    // Create a special marker card to track listening completion
    await prisma.collaborationCard.create({
      data: {
        wallSessionId: wallId,
        authorId: decoded.id,
        content: '__LISTENING_COMPLETION__',
        color: 'transparent',
        positionX: 0,
        positionY: 0,
        pointsAwarded: true, // Mark as points awarded
      },
    });

    return NextResponse.json({
      success: true,
      pointsAwarded,
      message: 'Points awarded for listening to the passage!',
    });
  } catch (error) {
    console.error('Error awarding listening points:', error);
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    );
  }
}
