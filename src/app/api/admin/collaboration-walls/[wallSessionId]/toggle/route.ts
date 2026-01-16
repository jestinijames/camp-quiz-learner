import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';

export async function PATCH(
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
    const body = await request.json();
    const { isActive } = body;

    // Update collaboration wall status
    const updatedWall = await prisma.collaborationWallSession.update({
      where: { id: parseInt(wallSessionId) },
      data: { isActive: isActive ?? false },
    });

    return NextResponse.json({
      success: true,
      message: isActive ? 'Wall activated successfully' : 'Wall closed successfully',
      wall: updatedWall
    });
  } catch (error) {
    console.error('Error toggling collaboration wall status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle collaboration wall status' },
      { status: 500 }
    );
  }
}
