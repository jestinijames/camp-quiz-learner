import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeVerses = searchParams.get('includeVerses') === 'true';

    if (includeVerses) {
      // Fetch books with chapters and verses for quiz creation
      const books = await prisma.bibleBook.findMany({
        include: {
          version: true,
          chapters: {
            include: {
              verses: {
                orderBy: { number: 'asc' }
              }
            },
            orderBy: { number: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(books);
    } else {
      // Basic books list without verses
      const books = await prisma.bibleBook.findMany({
        include: {
          version: true
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(books);
    }

  } catch (error) {
    console.error('Error fetching Bible books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Bible books' },
      { status: 500 }
    );
  }
}