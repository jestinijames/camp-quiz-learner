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
        book: true
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
        member: {
          include: { team: true }
        },
        answers: {
          include: {
            question: true
          }
        },
        triviaItems: true // ✅ Include trivia items to check if generated
      },
      orderBy: {
        member: {
          firstName: 'asc'
        }
      }
    });

    // Calculate stats
    const totalSessions = sessions.length;
    
    // Count descriptive answers that need correction
    const pendingCorrections = await prisma.answer.count({
      where: {
        session: {
          quizId: quizId,
          isSubmitted: true
        },
        question: {
          type: 'DESCRIPTIVE'
        },
        feedback: 'Awaiting manual review'
      }
    });

    // Count total descriptive answers
    const totalDescriptiveAnswers = await prisma.answer.count({
      where: {
        session: {
          quizId: quizId,
          isSubmitted: true
        },
        question: {
          type: 'DESCRIPTIVE'
        }
      }
    });

    // ✅ FIX: Count sessions WITHOUT any trivia items
    const sessionsWithoutTrivia = await prisma.quizSession.count({
      where: {
        quizId: quizId,
        isSubmitted: true,
        triviaItems: {
          none: {}
        }
      }
    });

    // Count sessions that are fully corrected (no pending descriptive answers)
    const correctedSessions = sessions.filter(session => {
      const descriptiveAnswers = session.answers.filter(a => a.question.type === 'DESCRIPTIVE');
      if (descriptiveAnswers.length === 0) return true; // No descriptive = auto-corrected
      return descriptiveAnswers.every(a => a.feedback !== 'Awaiting manual review');
    }).length;

    console.log(`📊 Correction Stats for Quiz ${quizId}:`);
    console.log(`   Total Sessions: ${totalSessions}`);
    console.log(`   Corrected Sessions: ${correctedSessions}`);
    console.log(`   Pending Corrections: ${pendingCorrections}`);
    console.log(`   Total Descriptive Answers: ${totalDescriptiveAnswers}`);
    console.log(`   Sessions Without Trivia: ${sessionsWithoutTrivia}`);

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