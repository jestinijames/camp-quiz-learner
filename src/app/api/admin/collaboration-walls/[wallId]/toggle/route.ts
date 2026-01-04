import { NextRequest, NextResponse } from 'next/server';

import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';

export async function PATCH(
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
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { wallId } = await params;
    const { isActive } = await request.json();

    const wallSession = await prisma.collaborationWallSession.update({
      where: { id: parseInt(wallId) },
      data: { isActive },
    });

    return NextResponse.json(wallSession);
  } catch (error) {
    console.error('Error toggling collaboration wall:', error);
    return NextResponse.json(
      { error: 'Failed to toggle collaboration wall' },
      { status: 500 }
    );
  }
}
