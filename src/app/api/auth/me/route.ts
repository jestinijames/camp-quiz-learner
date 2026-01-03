/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../lib/prisma';
import { verifyJwtNode } from '@/lib/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No token found' },
        { status: 401 }
      );
    }

    const decoded = verifyJwtNode(authToken) as any;

    if (decoded.isAdmin) {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id }
      });

      if (!admin) {
        return NextResponse.json(
          { error: 'Admin not found' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        id: admin.id,
        name: admin.username,
        isAdmin: true,
        team: null
      });
    } else {
      const member = await prisma.member.findUnique({
        where: { id: decoded.id },
        include: { team: true }
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        id: member.id,
        name: member.firstName,
        isAdmin: false,
        isApproved: member.isApproved,
        team: member.team ? {
          id: member.team.id,
          name: member.team.name
        } : null
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid token: ${error}` },
      { status: 401 }
    );
  }
}