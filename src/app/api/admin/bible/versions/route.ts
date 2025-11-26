import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET() {
  try {
    const versions = await prisma.bibleVersion.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Version name is required' },
        { status: 400 }
      );
    }

    const version = await prisma.bibleVersion.create({
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}