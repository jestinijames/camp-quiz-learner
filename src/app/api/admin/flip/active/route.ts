/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';



export async function GET() {
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

    // Get active flip game
    const activeGame = await prisma.flipGame.findFirst({
      where: { isActive: true },
      include: {
        BibleBook: {
          include: {
            BibleVersion: true,
          },
        },
        FlipAttempt: {
          include: {
            Member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdDate: 'desc' },
    });

    if (!activeGame) {
      return NextResponse.json({ game: null });
    }

    return NextResponse.json({ game: activeGame });
  } catch (error: any) {
    console.error('Error fetching active flip game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active flip game' },
      { status: 500 }
    );
  }
}
