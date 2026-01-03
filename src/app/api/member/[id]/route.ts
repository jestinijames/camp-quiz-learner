import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);

    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: 'Invalid member ID' },
        { status: 400 }
      );
    }

    // Delete the member
    await prisma.member.delete({
      where: { id: memberId }
    });

    return NextResponse.json({ 
      status: 'success', 
      message: 'Member deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
