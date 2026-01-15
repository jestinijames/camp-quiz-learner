/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '../../../../../../../lib/prisma';


export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { logo } = body;

    if (!logo) {
      return NextResponse.json({ error: 'Logo URL is required' }, { status: 400 });
    }

    // Update team with logo
    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(id) },
      data: { logo },
      include: {
        Member: true
      }
    });

    return NextResponse.json({
      success: true,
      team: updatedTeam
    });

  } catch (error: any) {
    console.error('Error updating team logo:', error);
    return NextResponse.json({ 
      error: `Failed to update logo: ${error.message}` 
    }, { status: 500 });
  }
}
