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

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 AUTO-CORRECTING DESCRIPTIVE ANSWERS FOR QUIZ ${quizId}`);
    console.log(`${'='.repeat(80)}\n`);

    // Get all UNCORRECTED descriptive answers for this quiz
    const uncorrectedAnswers = await prisma.answer.findMany({
      where: {
        session: {
          quizId: quizId,
          isSubmitted: true
        },
        question: {
          type: 'DESCRIPTIVE'
        },
        // ✅ ONLY get answers that haven't been corrected yet
        feedback: 'Awaiting manual review'
      },
      include: {
        question: true,
        session: {
          include: {
            member: {
              include: { team: true }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📊 Found ${uncorrectedAnswers.length} uncorrected descriptive answers`);

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
        console.log(`\n[${i + 1}/${uncorrectedAnswers.length}] Correcting answer ${answer.id}`);
        console.log(`   Member: ${answer.session.member.firstName} (${answer.session.member.team.name})`);
        console.log(`   Question: ${answer.question.text.substring(0, 60)}...`);
        console.log(`   Answer: ${answer.response.substring(0, 60)}...`);

        // Call AI correction - FIXED: Removed keywords parameter
        const result = await correctDescriptiveAnswer(
          answer.question.text,
          answer.question.answer,
          answer.response,
          answer.question.points,
          answer.question.verseRef || 'N/A'
        );

        console.log(`   ✅ AI Result: ${result.points}/${answer.question.points} pts - "${result.feedback.substring(0, 50)}..."`);

        // ✅ IMMEDIATELY STORE the correction in database
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            points: result.points,
            isCorrect: result.isCorrect,
            feedback: result.feedback
          }
        });

        console.log(`   💾 Saved to database`);

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

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ CORRECTION BATCH COMPLETE`);
    console.log(`   Corrected: ${correctedCount}`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Remaining: ${remainingCount}`);
    console.log(`${'='.repeat(80)}\n`);

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