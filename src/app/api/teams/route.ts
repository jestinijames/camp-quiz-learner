import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            Member: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(teams);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch teams: ${error}` },
      { status: 500 }
    );
  }
}