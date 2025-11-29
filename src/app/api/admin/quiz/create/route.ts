/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No token found' },
        { status: 401 }
      );
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    if (!decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      bookId, 
      timeLimit, 
      isActive, 
      fromChapter,
      fromVerse,
      toChapter,
      toVerse,
      questions 
    } = body;

    // Validate required fields
    if (!title || !bookId || !questions || questions.length !== 3) {
      return NextResponse.json(
        { error: 'Title, book, verse range, and exactly 3 questions are required' },
        { status: 400 }
      );
    }

    if (!fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json(
        { error: 'Complete verse range is required' },
        { status: 400 }
      );
    }

    // Create quiz instance with verse range
    const quiz = await prisma.quizInstance.create({
      data: {
        title,
        description,
        bookId: parseInt(bookId),
        timeLimit,
        isActive,
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        adminId: decoded.id,
        questions: {
          create: questions.map((q: any) => ({
            type: q.type,
            text: q.text,
            options: q.options,
            answer: q.answer,
            points: q.points || 10,
            order: q.order
          }))
        }
      },
      include: {
        questions: true,
        book: {
          include: {
            version: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Quiz created successfully',
      quiz
    });

  } catch (error) {
    console.error('Quiz creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}