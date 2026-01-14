import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { wallId } = await params;

    // Fetch all cards for this wall session (admin view - all teams)
    const cards = await prisma.collaborationCard.findMany({
      where: {
        wallSessionId: parseInt(wallId),
        content: {
          not: '__LISTENING_COMPLETION__' // Exclude marker cards
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
                name: true
              }
            }
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching collaboration cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration cards' },
      { status: 500 }
    );
  }
}
