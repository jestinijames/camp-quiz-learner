import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const wallSessions = await prisma.collaborationWallSession.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        BibleBook: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            CollaborationCard: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions: wallSessions });
  } catch (error) {
    console.error('Error fetching collaboration walls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration walls' },
      { status: 500 }
    );
  }
}
