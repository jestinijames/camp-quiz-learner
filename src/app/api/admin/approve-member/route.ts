import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as { id: number; isAdmin: boolean };
    
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { memberId, teamId } = await request.json();

    if (!memberId || !teamId) {
      return NextResponse.json(
        { error: 'Member ID and Team ID are required' },
        { status: 400 }
      );
    }

    // Update member: set isApproved to true and assign team
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        isApproved: true,
        teamId: teamId,
      },
      include: { Team: true },
    });

    return NextResponse.json({
      message: 'Member approved successfully',
      member: {
        id: updatedMember.id,
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        email: updatedMember.email,
        team: updatedMember.Team,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
