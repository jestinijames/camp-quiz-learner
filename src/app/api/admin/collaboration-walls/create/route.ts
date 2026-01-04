import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { title, description, bookId, fromChapter, fromVerse, toChapter, toVerse } = await request.json();

    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const wallSession = await prisma.collaborationWallSession.create({
      data: {
        title,
        description: description || null,
        bookId,
        fromChapter,
        fromVerse,
        toChapter,
        toVerse,
        adminId: decoded.id,
        isActive: true,
      },
      include: {
        book: true,
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(wallSession);
  } catch (error) {
    console.error('Error creating collaboration wall:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration wall' },
      { status: 500 }
    );
  }
}
