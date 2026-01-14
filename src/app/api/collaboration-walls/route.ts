import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active collaboration wall sessions
    const wallSessions = await prisma.collaborationWallSession.findMany({
      where: { isActive: true },
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
            CollaborationCard: {
              where: {
                content: {
                  not: '__LISTENING_COMPLETION__' // Exclude marker cards from count
                }
              }
            },
          },
        },
      },
    });

    return NextResponse.json(wallSessions);
  } catch (error) {
    console.error('Error fetching collaboration walls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration walls' },
      { status: 500 }
    );
  }
}
