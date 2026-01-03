/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { generate10Questions } from '../../../../../lib/ollamaQuestions';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    // Admin authentication (same as your quiz create)
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { 
      version, 
      book, 
      fromChapter, 
      fromVerse, 
      toChapter, 
      toVerse, 
      questionType 
    } = await request.json();

    // Validate inputs
    if (!version || !book || !fromChapter || !fromVerse || !toChapter || !toVerse || !questionType) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Fetch verses from your DB for exact range - CORRECTED QUERY
    const verses = await prisma.bibleVerse.findMany({
      where: {
        chapter: {
          number: {
            gte: fromChapter,
            lte: toChapter
          },
          book: {
            name: book,
            version: {
              name: version
            }
          }
        },
        AND: [
          {
            // For first chapter, start from fromVerse
            OR: [
              {
                chapter: { number: { gt: fromChapter } }
              },
              {
                chapter: { number: fromChapter },
                number: { gte: fromVerse }
              }
            ]
          },
          {
            // For last chapter, end at toVerse
            OR: [
              {
                chapter: { number: { lt: toChapter } }
              },
              {
                chapter: { number: toChapter },
                number: { lte: toVerse }
              }
            ]
          }
        ]
      },
      include: {
        chapter: true
      },
      orderBy: [
        { chapter: { number: 'asc' } },
        { number: 'asc' }
      ]
    });

    if (verses.length === 0) {
      return NextResponse.json({ 
        error: 'No verses found in range' 
      }, { status: 400 });
    }

    // Create the passage string
    const passage = verses
      .map(v => `${v.chapter.number}:${v.number} ${v.text}`)
      .join(' ');

    // Generate questions with better error handling
    try {
      const questions = await generate10Questions(
        version,
        book,
        fromChapter,
        fromVerse,
        toChapter,
        toVerse,
        passage,
        questionType
      );

      return NextResponse.json({ 
        questions,
        verseCount: verses.length,
        questionType,
        actualCount: questions.length
      });

    } catch (aiError: any) {
      console.error(`AI generation failed for ${questionType}:`, aiError);
      return NextResponse.json({ 
        error: `AI generation failed: ${aiError.message}` 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Generate questions API error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate questions'
    }, { status: 500 });
  }
}
