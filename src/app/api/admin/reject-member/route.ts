import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

export async function DELETE(request: Request) {
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

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Delete the member from database
    await prisma.member.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      message: 'Member rejected and deleted successfully',
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
