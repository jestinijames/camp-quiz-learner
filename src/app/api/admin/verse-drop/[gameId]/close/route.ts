/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../../lib/prisma';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
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

    const { gameId } = await params;
    const parsedGameId = parseInt(gameId);

    // Update the game to inactive
    const updatedGame = await prisma.verseDropGame.update({
      where: { id: parsedGameId },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: `Verse Drop "${updatedGame.title}" has been closed`,
      game: updatedGame
    });

  } catch (error: any) {
    console.error('Error closing Verse Drop:', error);
    return NextResponse.json(
      { error: 'Failed to close Verse Drop game' },
      { status: 500 }
    );
  }
}
