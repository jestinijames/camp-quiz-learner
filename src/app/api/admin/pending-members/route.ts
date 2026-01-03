import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

export async function GET() {
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

    // Fetch all pending members
    const pendingMembers = await prisma.member.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(pendingMembers);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
