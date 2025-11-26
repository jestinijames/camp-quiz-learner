import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      );
    }

    const books = await prisma.bibleBook.findMany({
      where: {
        versionId: parseInt(versionId)
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, versionId } = await request.json();

    if (!name || !name.trim() || !versionId) {
      return NextResponse.json(
        { error: 'Book name and version ID are required' },
        { status: 400 }
      );
    }

    const book = await prisma.bibleBook.create({
      data: {
        name: name.trim(),
        versionId: parseInt(versionId)
      }
    });

    return NextResponse.json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}