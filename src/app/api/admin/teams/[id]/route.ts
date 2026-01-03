import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    // First, unassign all members from this team
    await prisma.member.updateMany({
      where: { teamId },
      data: { teamId: null }
    });

    // Then delete the team
    await prisma.team.delete({
      where: { id: teamId }
    });

    return NextResponse.json({ 
      status: 'success', 
      message: 'Team deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
