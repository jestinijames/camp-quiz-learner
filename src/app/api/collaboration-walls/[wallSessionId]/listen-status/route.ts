import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '../../../../../../lib/prisma';


export async function GET(
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

    // Check if user has already received points for listening to this wall
    const existingListenRecord = await prisma.collaborationCard.findFirst({
      where: {
        wallSessionId: wallId,
        authorId: decoded.id,
        content: '__LISTENING_COMPLETION__',
      },
    });

    return NextResponse.json({
      hasListened: !!existingListenRecord,
      pointsAwarded: existingListenRecord?.pointsAwarded || 0,
    });
  } catch (error) {
    console.error('Error checking listening status:', error);
    return NextResponse.json(
      { error: 'Failed to check listening status' },
      { status: 500 }
    );
  }
}
