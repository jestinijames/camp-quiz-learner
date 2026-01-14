/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const includeVerses = searchParams.get('includeVerses') === 'true';

    const whereClause: any = {};
    if (versionId) {
      whereClause.versionId = parseInt(versionId);
    }

    if (includeVerses) {
      // Fetch books with chapters and verses for quiz creation
      const books = await prisma.bibleBook.findMany({
        where: whereClause,
        include: {
          BibleVersion: true,
          BibleChapter: {
            include: {
              BibleVerse: {
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
        where: whereClause,
        include: {
          BibleVersion: true
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

// ADD THIS POST METHOD
export async function POST(request: Request) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get request data
    const { name, versionId } = await request.json();

    if (!name || !versionId) {
      return NextResponse.json(
        { error: 'Name and versionId are required' },
        { status: 400 }
      );
    }

    // Check if book already exists for this version
    const existingBook = await prisma.bibleBook.findFirst({
      where: {
        name: name.trim(),
        versionId: parseInt(versionId)
      }
    });

    if (existingBook) {
      return NextResponse.json(
        { error: 'Book already exists in this version' },
        { status: 400 }
      );
    }

    // Create the book
    const newBook = await prisma.bibleBook.create({
      data: {
        name: name.trim(),
        versionId: parseInt(versionId)
      },
      include: {
        BibleVersion: true
      }
    });

    return NextResponse.json(newBook, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating Bible book:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create book: ${errorMessage}` },
      { status: 500 }
    );
  }
}