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

    // Get session filter from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Build the where clause
    const whereClause: {
      content: { notIn: string[] };
      wallSessionId?: number;
    } = {
      content: {
        notIn: ['__LISTENING_COMPLETION__', '__LISTENING_SKIPPED__']
      }
    };

    // Add session filter if provided
    if (sessionId && sessionId !== 'all') {
      whereClause.wallSessionId = parseInt(sessionId);
    }

    // Fetch all collaboration cards (from all teams)
    const cards = await prisma.collaborationCard.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        color: true,
        positionX: true,
        positionY: true,
        authorId: true,
        Member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            Team: {
              select: {
                id: true,
                name: true,
                logo: true,
              }
            }
          },
        },
        CollaborationWallSession: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500, // Limit to 500 most recent cards to prevent JSON overflow
    });

    console.log(`[All Collaboration Cards] Fetched ${cards.length} cards ${sessionId ? `for session ${sessionId}` : '(all sessions)'}`);
    
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching all collaboration cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration cards' },
      { status: 500 }
    );
  }
}
