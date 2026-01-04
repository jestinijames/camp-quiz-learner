import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../lib/prisma';

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

    const wallSession = await prisma.collaborationWallSession.findUnique({
      where: { id: parseInt(wallSessionId) },
      include: {
        book: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!wallSession) {
      return NextResponse.json({ error: 'Wall session not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...wallSession,
      currentUserId: decoded.id // Add current user ID to response
    });
  } catch (error) {
    console.error('Error fetching wall session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wall session' },
      { status: 500 }
    );
  }
}
