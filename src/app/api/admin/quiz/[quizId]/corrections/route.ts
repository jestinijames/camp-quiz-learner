/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/quiz/[quizId]/corrections/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../../lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // Get quiz details
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: {
        BibleBook: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get all submitted sessions
    const sessions = await prisma.quizSession.findMany({
      where: {
        quizId: quizId,
        isSubmitted: true
      },
      include: {
        Member: {
          include: { Team: true }
        },
        Answer: {
          include: {
            Question: true
          }
        },
        TriviaItem: true // ✅ Include trivia items to check if generated
      },
      orderBy: {
        Member: {
          firstName: 'asc'
        }
      }
    });

    // Calculate stats
    const totalSessions = sessions.length;
    
    // Count descriptive answers that need correction
    const pendingCorrections = await prisma.answer.count({
      where: {
        QuizSession: {
          quizId: quizId,
          isSubmitted: true
        },
        Question: {
          type: 'DESCRIPTIVE'
        },
        feedback: 'Awaiting manual review'
      }
    });

    // Count total descriptive answers
    const totalDescriptiveAnswers = await prisma.answer.count({
      where: {
        QuizSession: {
          quizId: quizId,
          isSubmitted: true
        },
        Question: {
          type: 'DESCRIPTIVE'
        }
      }
    });

    // ✅ FIX: Count sessions WITHOUT any trivia items
    const sessionsWithoutTrivia = await prisma.quizSession.count({
      where: {
        quizId: quizId,
        isSubmitted: true,
        TriviaItem: {
          none: {}
        }
      }
    });

    // Count sessions that are fully corrected (no pending descriptive answers)
    const correctedSessions = sessions.filter(session => {
      const descriptiveAnswers = session.Answer.filter((a) => a.Question.type === 'DESCRIPTIVE');
      if (descriptiveAnswers.length === 0) return true; // No descriptive = auto-corrected
      return descriptiveAnswers.every((a) => a.feedback !== 'Awaiting manual review');
    }).length;

    const stats = {
      totalSessions,
      correctedSessions,
      pendingCorrections,
      totalDescriptiveAnswers,
      sessionsWithoutTrivia
    };

    return NextResponse.json({
      quiz,
      sessions,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch corrections' 
    }, { status: 500 });
  }
}