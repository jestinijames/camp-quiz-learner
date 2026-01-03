import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    const chapters = await prisma.bibleChapter.findMany({
      where: {
        bookId: parseInt(bookId)
      },
      orderBy: {
        number: 'asc'
      }
    });
    
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { number, bookId } = await request.json();

    if (!number || !bookId) {
      return NextResponse.json(
        { error: 'Chapter number and book ID are required' },
        { status: 400 }
      );
    }

    const chapter = await prisma.bibleChapter.create({
      data: {
        number: parseInt(number),
        bookId: parseInt(bookId)
      }
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}