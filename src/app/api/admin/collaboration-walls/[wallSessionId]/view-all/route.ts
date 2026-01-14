import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';

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
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { wallSessionId } = await params;

    // Fetch all cards for this wall session (admin can see all teams)
    const cards = await prisma.collaborationCard.findMany({
      where: {
        wallSessionId: parseInt(wallSessionId),
        content: {
          notIn: ['__LISTENING_COMPLETION__', '__LISTENING_SKIPPED__'] // Exclude marker cards
        }
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
                name: true,
              }
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to match expected format
    const transformedCards = cards.map(card => ({
      id: card.id,
      content: card.content,
      author: {
        firstName: card.Member?.firstName || 'Unknown',
        lastName: card.Member?.lastName || '',
        team: card.Member?.Team || null
      }
    }));

    return NextResponse.json(transformedCards);
  } catch (error) {
    console.error('Error fetching collaboration cards for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration cards' },
      { status: 500 }
    );
  }
}
