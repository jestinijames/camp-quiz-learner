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

    // Parse request body to check if this is a completed, skipped, or incomplete attempt
    const body = await request.json().catch(() => ({ completedListening: true }));
    const completedListening = body.completedListening !== false; // Default to true for backwards compatibility
    const skipped = body.skipped === true; // Check if user explicitly clicked skip button

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

    // Check if user has already received points for listening to this wall (any type)
    const existingListenRecord = await prisma.collaborationCard.findFirst({
      where: {
        wallSessionId: wallId,
        authorId: decoded.id,
        content: {
          in: ['__LISTENING_COMPLETION__', '__LISTENING_SKIPPED__'] // Check for any listening marker
        }
      },
    });

    if (existingListenRecord) {
      return NextResponse.json(
        { error: 'Points already awarded for listening to this passage', alreadyAwarded: true },
        { status: 200 }
      );
    }

    // If skipped (clicked "I'm done"), create a 1-point marker card
    if (skipped) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      await prisma.collaborationCard.create({
        data: {
          id: uniqueId,
          wallSessionId: wallId,
          authorId: decoded.id,
          content: '__LISTENING_SKIPPED__',
          color: 'transparent',
          positionX: 0,
          positionY: 0,
          pointsAwarded: false, // Track as skipped for 1 point
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        pointsAwarded: 1,
        message: 'Thanks for reading! +1 point awarded',
      });
    }

    // If incomplete attempt (not skipped, just closed), create a 0-point marker card
    if (!completedListening) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      await prisma.collaborationCard.create({
        data: {
          id: uniqueId,
          wallSessionId: wallId,
          authorId: decoded.id,
          content: '__LISTENING_COMPLETION__',
          color: 'transparent',
          positionX: 0,
          positionY: 0,
          pointsAwarded: false, // No points for incomplete attempt
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        pointsAwarded: 0,
        message: 'Listening attempt tracked (incomplete)',
      });
    }

    // Complete listening - award points
    const pointsAwarded = 4;

    // Create a special marker card to track listening completion
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    await prisma.collaborationCard.create({
      data: {
        id: uniqueId,
        wallSessionId: wallId,
        authorId: decoded.id,
        content: '__LISTENING_COMPLETION__',
        color: 'transparent',
        positionX: 0,
        positionY: 0,
        pointsAwarded: true, // Mark as points awarded
        updatedAt: new Date(),
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
