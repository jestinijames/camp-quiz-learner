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

    const cards = await prisma.collaborationCard.findMany({
      where: {
        wallSessionId: parseInt(wallSessionId),
        content: {
          not: '__LISTENING_COMPLETION__' // Exclude marker cards
        }
      },
      include: {
        author: {
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
    const { content, color, positionX, positionY, quizSessionId, pointsAwarded } = await request.json();

    if (!content || !color) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const card = await prisma.collaborationCard.create({
      data: {
        wallSessionId: parseInt(wallSessionId),
        authorId: decoded.id,
        content,
        color,
        positionX: positionX ?? 0,
        positionY: positionY ?? 0,
        quizSessionId: quizSessionId || null,
        pointsAwarded: false, // Boolean field, not integer
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error('Error creating collaboration card:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration card' },
      { status: 500 }
    );
  }
}
