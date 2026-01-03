import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';


export async function PATCH(request: Request) {
  try {
    const { memberId, teamId } = await request.json();

    if (!memberId || !teamId) {
      return NextResponse.json(
        { error: 'Member ID and Team ID are required' },
        { status: 400 }
      );
    }

    // Update member's team
    await prisma.member.update({
      where: { id: memberId },
      data: { teamId: teamId },
    });

    return NextResponse.json({ 
      status: 'success', 
      message: 'Member reassigned successfully' 
    });
  } catch (error) {
    console.error('Error reassigning member:', error);
    return NextResponse.json(
      { error: 'Failed to reassign member' },
      { status: 500 }
    );
  }
}
