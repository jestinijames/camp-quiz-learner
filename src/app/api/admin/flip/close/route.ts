/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';


export async function POST(request: Request) {
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

    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Close the flip game
    const updatedGame = await prisma.flipGame.update({
      where: { id: gameId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      game: updatedGame,
    });
  } catch (error: any) {
    console.error('Error closing flip game:', error);
    return NextResponse.json(
      { error: 'Failed to close flip game' },
      { status: 500 }
    );
  }
}
