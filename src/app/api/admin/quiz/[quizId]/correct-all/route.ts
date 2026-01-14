/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/quiz/[quizId]/correct-all/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../../lib/jwt';
import { prisma } from '../../../../../../../lib/prisma';
import { correctDescriptiveAnswer } from '../../../../../../../lib/ollamaCorrection';


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

    // Get all UNCORRECTED descriptive answers for this quiz
    const uncorrectedAnswers = await prisma.answer.findMany({
      where: {
        QuizSession: {
          quizId: quizId,
          isSubmitted: true
        },
        Question: {
          type: 'DESCRIPTIVE'
        },
        /* Lines 40-41 omitted */
        feedback: 'Awaiting manual review'
      },
      include: {
        Question: true,
        QuizSession: {
          include: {
            Member: {
              include: { Team: true }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });


    if (uncorrectedAnswers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All descriptive answers are already corrected',
        corrected: 0,
        total: 0,
        remaining: 0,
        errors: []
      });
    }

    let correctedCount = 0;
    const errors: string[] = [];

    // Process each answer ONE AT A TIME and STORE immediately
    for (let i = 0; i < uncorrectedAnswers.length; i++) {
      const answer = uncorrectedAnswers[i];
      
      try {
        // Call AI correction - FIXED: Removed keywords parameter
        const result = await correctDescriptiveAnswer(
          answer.Question.text,
          answer.Question.answer,
          answer.response,
          answer.Question.points,
          answer.Question.verseRef || 'N/A'
        );

        // ✅ IMMEDIATELY STORE the correction in database
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            points: result.points,
            isCorrect: result.isCorrect,
            feedback: result.feedback
          }
        });


        // Update session total score
        const sessionAnswers = await prisma.answer.findMany({
          where: { sessionId: answer.sessionId }
        });

        const totalScore = sessionAnswers.reduce((sum, a) => sum + (a.points || 0), 0);

        await prisma.quizSession.update({
          where: { id: answer.sessionId },
          data: { totalScore }
        });

        correctedCount++;

      } catch (error: any) {
        console.error(`   ❌ Error correcting answer ${answer.id}:`, error.message);
        errors.push(`Answer ${answer.id}: ${error.message}`);
        
        // ❌ Don't stop - continue with next answer
        continue;
      }
    }

    // Get remaining uncorrected count
    const remainingCount = await prisma.answer.count({
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


    return NextResponse.json({
      success: true,
      message: remainingCount > 0 
        ? `Corrected ${correctedCount} answers. ${remainingCount} still pending. Click again to continue.`
        : `All descriptive answers corrected successfully!`,
      corrected: correctedCount,
      total: uncorrectedAnswers.length,
      remaining: remainingCount,
      errors
    });

  } catch (error: any) {
    console.error('❌ Fatal error in correct-all:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}