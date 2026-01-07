/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { adjustment, reason } = await request.json();

    // Validate adjustment is a number
    if (typeof adjustment !== 'number' || isNaN(adjustment)) {
      return NextResponse.json({ error: 'Invalid adjustment value' }, { status: 400 });
    }

    // Get current team data
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id) }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const currentManualPoints = team.manualPoints || 0;
    const newManualPoints = currentManualPoints + adjustment;

    // Update team's manual points
    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(id) },
      data: { manualPoints: newManualPoints }
    });

    // Activity logging removed - ActivityLog model not in schema

    return NextResponse.json({
      success: true,
      message: `${adjustment > 0 ? 'Added' : 'Subtracted'} ${Math.abs(adjustment)} points ${adjustment > 0 ? 'to' : 'from'} ${team.name}`,
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        manualPoints: updatedTeam.manualPoints,
        adjustment
      }
    });

  } catch (error: any) {
    console.error('Error adjusting team points:', error);
    return NextResponse.json(
      { error: 'Failed to adjust team points' },
      { status: 500 }
    );
  }
}
