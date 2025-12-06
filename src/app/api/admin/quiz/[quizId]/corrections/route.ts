/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/quiz/[quizId]/corrections/route.ts
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
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

    // Get quiz with all sessions and answers
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: {
        book: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get quiz sessions with answers
    const sessions = await prisma.quizSession.findMany({
      where: { quizId },
      include: {
        member: {
          include: { team: true }
        },
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    // Calculate stats
    const stats = {
      totalSessions: sessions.length,
      correctedSessions: sessions.filter(s => 
        s.answers.every(a => 
          a.question.type !== 'DESCRIPTIVE' || 
          a.feedback !== 'Awaiting manual review' // ✅ Check feedback, not points
        )
      ).length,
      pendingCorrections: sessions.filter(s => 
        s.answers.some(a => 
          a.question.type === 'DESCRIPTIVE' && 
          a.feedback === 'Awaiting manual review' // ✅ Check feedback, not points
        )
      ).length,
      totalDescriptiveAnswers: sessions.reduce((total, s) => 
        total + s.answers.filter(a => 
          a.question.type === 'DESCRIPTIVE' && 
          a.feedback === 'Awaiting manual review' // ✅ Check feedback, not points
        ).length, 0
      )
    };

    return NextResponse.json({
      quiz,
      sessions,
      stats
    });

  } catch (error) {
    console.error('Error fetching correction data:', error);
    return NextResponse.json({ error: 'Failed to fetch correction data' }, { status: 500 });
  }
}