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
    const wallIdNum = parseInt(wallId);

    console.log('Toggling wall:', wallIdNum);

    // Get current wall state
    const currentWall = await prisma.collaborationWallSession.findUnique({
      where: { id: wallIdNum }
    });

    if (!currentWall) {
      return NextResponse.json({ error: 'Wall not found' }, { status: 404 });
    }

    // Toggle the current state
    const newIsActive = !currentWall.isActive;
    console.log('Current state:', currentWall.isActive, 'New state:', newIsActive);

    // Update wall session
    const wallSession = await prisma.collaborationWallSession.update({
      where: { id: wallIdNum },
      data: { isActive: newIsActive },
    });

    console.log('Wall toggled successfully:', wallSession);

    return NextResponse.json({ 
      success: true, 
      wallSession,
      message: `Collaboration wall ${newIsActive ? 'opened' : 'closed'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling collaboration wall:', error);
    return NextResponse.json(
      { error: 'Failed to toggle collaboration wall', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
