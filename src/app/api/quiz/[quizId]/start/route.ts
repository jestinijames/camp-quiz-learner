/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Member access only' }, { status: 403 });
    }

    const { quizId } = await context.params;
    const quizInstanceId = parseInt(quizId);

    // Get quiz instance
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizInstanceId },
      include: {
        book: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: 'Quiz is not active' }, { status: 400 });
    }

    // Check if user already has a session for this quiz (including submitted ones)
    let session = await prisma.quizSession.findUnique({
      where: {
        quizId_memberId: {
          quizId: quizInstanceId,
          memberId: decoded.id
        }
      }
    });

    // If already submitted, don't allow retaking
    if (session?.isSubmitted) {
      return NextResponse.json({ error: 'Quiz already submitted' }, { status: 400 });
    }

    // Randomly select 1 question of each type
    const [fillInBlank] = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'FILL_IN_BLANK'
      },
      orderBy: {
        id: 'asc'
      },
      take: 1,
      skip: Math.floor(Math.random() * 10) // Random offset within first 10
    });

    const [multipleChoice] = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'MULTIPLE_CHOICE'
      },
      orderBy: {
        id: 'asc'
      },
      take: 1,
      skip: Math.floor(Math.random() * 10)
    });

    const [descriptive] = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'DESCRIPTIVE'
      },
      orderBy: {
        id: 'asc'
      },
      take: 1,
      skip: Math.floor(Math.random() * 10)
    });

    const selectedQuestions = [fillInBlank, multipleChoice, descriptive].filter(Boolean);

    if (selectedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 400 });
    }

    // Use a transaction to ensure atomic operations
    if (!session) {
      // No session exists, create a new one
      session = await prisma.$transaction(async (tx) => {
        const newSession = await tx.quizSession.create({
          data: {
            quizId: quizInstanceId,
            memberId: decoded.id,
            startTime: new Date(),
            isSubmitted: false
          }
        });

        // Record which questions were assigned to this session
        await tx.questionUsage.createMany({
          data: selectedQuestions.map(q => ({
            sessionId: newSession.id,
            questionId: q.id
          }))
        });

        return newSession;
      });
    } else {
      // Incomplete session exists - use transaction to delete old and create new atomically
      await prisma.$transaction(async (tx) => {
        // Delete all old question usages for this session
        await tx.questionUsage.deleteMany({
          where: { sessionId: session!.id }
        });

        // Reset the session start time
        await tx.quizSession.update({
          where: { id: session!.id },
          data: {
            startTime: new Date(),
            isSubmitted: false
          }
        });

        // Assign new random questions (exactly 3)
        await tx.questionUsage.createMany({
          data: selectedQuestions.map(q => ({
            sessionId: session!.id,
            questionId: q.id
          }))
        });
      });
    }

    // Get the assigned questions for response
    const usages = await prisma.questionUsage.findMany({
      where: { sessionId: session.id },
      include: { question: true }
    });

    const questionsForResponse = usages.map(u => u.question);

    return NextResponse.json({
      session: {
        id: session.id,
        startedAt: session.startTime
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        book: quiz.book,
        fromChapter: quiz.fromChapter,
        fromVerse: quiz.fromVerse,
        toChapter: quiz.toChapter,
        toVerse: quiz.toVerse,
        timeLimit: quiz.timeLimit,
        questions: questionsForResponse.map(q => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options,
          points: q.points,
          order: q.order
        }))
      }
    });

  } catch (error: any) {
    console.error('Error starting quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to start quiz' }, { status: 500 });
  }
}
