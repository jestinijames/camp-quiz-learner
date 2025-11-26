import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json(
        { error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const verses = await prisma.bibleVerse.findMany({
      where: {
        chapterId: parseInt(chapterId)
      },
      orderBy: {
        number: 'asc'
      }
    });
    
    return NextResponse.json(verses);
  } catch (error) {
    console.error('Error fetching verses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { verses, chapterId } = await request.json();

    if (!Array.isArray(verses) || !chapterId) {
      return NextResponse.json(
        { error: 'Verses array and chapter ID are required' },
        { status: 400 }
      );
    }

    // Delete existing verses for this chapter
    await prisma.bibleVerse.deleteMany({
      where: {
        chapterId: parseInt(chapterId)
      }
    });

    // Create new verses
    const createdVerses = [];
    for (const verse of verses) {
      if (verse.text && verse.text.trim()) {
        const createdVerse = await prisma.bibleVerse.create({
          data: {
            number: verse.number,
            text: verse.text.trim(),
            chapterId: parseInt(chapterId)
          }
        });
        createdVerses.push(createdVerse);
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `${createdVerses.length} verses saved successfully`,
      verses: createdVerses 
    });
  } catch (error) {
    console.error('Error saving verses:', error);
    return NextResponse.json(
      { error: 'Failed to save verses' },
      { status: 500 }
    );
  }
}