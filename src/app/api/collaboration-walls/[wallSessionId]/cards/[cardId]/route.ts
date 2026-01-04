import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ wallSessionId: string; cardId: string }> }
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

    const { cardId } = await params;
    const { content, color, positionX, positionY, pointsAwarded } = await request.json();

    // Verify the card belongs to the user or user is admin
    const existingCard = await prisma.collaborationCard.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (existingCard.authorId !== decoded.id && !decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only edit your own cards' },
        { status: 403 }
      );
    }

    const updateData: Record<string, string | number | undefined> = {};
    if (content !== undefined) updateData.content = content;
    if (color !== undefined) updateData.color = color;
    if (positionX !== undefined) updateData.positionX = positionX;
    if (positionY !== undefined) updateData.positionY = positionY;
    if (pointsAwarded !== undefined && decoded.isAdmin) updateData.pointsAwarded = pointsAwarded;

    const card = await prisma.collaborationCard.update({
      where: { id: cardId },
      data: updateData,
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
    console.error('Error updating collaboration card:', error);
    return NextResponse.json(
      { error: 'Failed to update collaboration card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wallSessionId: string; cardId: string }> }
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

    const { cardId } = await params;

    // Verify the card belongs to the user or user is admin
    const existingCard = await prisma.collaborationCard.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (existingCard.authorId !== decoded.id && !decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete your own cards' },
        { status: 403 }
      );
    }

    await prisma.collaborationCard.delete({
      where: { id: cardId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collaboration card:', error);
    return NextResponse.json(
      { error: 'Failed to delete collaboration card' },
      { status: 500 }
    );
  }
}
