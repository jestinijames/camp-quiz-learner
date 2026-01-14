/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';

export async function POST(
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

    // Check if all corrections are done
    const uncorrectedCount = await prisma.answer.count({
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

    if (uncorrectedCount > 0) {
      return NextResponse.json({ 
        error: `Cannot close quiz: ${uncorrectedCount} descriptive answers still need correction`,
        uncorrectedCount
      }, { status: 400 });
    }

    // ✅ Everything is done - CLOSE the quiz
    const updatedQuiz = await prisma.quizInstance.update({
      where: { id: quizId },
      data: {
        isActive: false,
        endDate: new Date()
      },
      include: {
        BibleBook: true,
        QuizSession: {
          where: { isSubmitted: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Quiz "${updatedQuiz.title}" closed successfully`,
      quiz: {
        id: updatedQuiz.id,
        title: updatedQuiz.title,
        participants: updatedQuiz.QuizSession.length,
        endDate: updatedQuiz.endDate
      }
    });

  } catch (error: any) {
    console.error('Error closing quiz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}