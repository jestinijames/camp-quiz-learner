// src/app/api/admin/quiz/[quizId]/generate-trivia/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../../lib/prisma';
import { generatePersonalizedTrivia } from '../../../../../../../lib/ollamaTrivia';


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

    // Get quiz details
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: { book: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get all submitted sessions WITHOUT trivia yet
    const sessionsNeedingTrivia = await prisma.quizSession.findMany({
      where: {
        quizId: quizId,
        isSubmitted: true,
        // ✅ ONLY sessions that don't have trivia yet
        triviaItems: {
          none: {}
        },
        // Only include members who have been approved and assigned to a team
        member: {
          isApproved: true,
          teamId: {
            not: null
          }
        }
      },
      include: {
        member: {
          include: { team: true }
        },
        answers: {
          include: { question: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    if (sessionsNeedingTrivia.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All sessions already have trivia generated',
        generated: 0,
        total: 0,
        remaining: 0,
        errors: []
      });
    }

    let generatedCount = 0;
    let totalTriviaItems = 0;
    const errors: string[] = [];

    // Process each session ONE AT A TIME
    for (let i = 0; i < sessionsNeedingTrivia.length; i++) {
      const session = sessionsNeedingTrivia[i];
      
      try {
        // Skip if member doesn't have a team (safety check)
        if (!session.member.team) {
          console.warn(`Skipping session ${session.id}: Member has no team assigned`);
          continue;
        }

        // Generate trivia items
        const triviaItems = await generatePersonalizedTrivia(
          session.member.firstName,
          session.member.team.name,
          session.answers,
          quiz,
          prisma
        );

        // ✅ IMMEDIATELY STORE each trivia item
        for (const item of triviaItems) {
          await prisma.triviaItem.create({
            data: {
              quizId: quizId,
              sessionId: session.id,
              memberId: session.memberId,
              type: item.type,
              title: item.title,
              content: item.content,
              insight: item.insight || null,
              suggestedReading: item.suggestedReading || null,
              studyTips: item.studyTips || null,
              isPublished: true,
              publishedAt: new Date(),
              priority: 1,
              adminId: decoded.id
            }
          });
        }


        generatedCount++;
        totalTriviaItems += triviaItems.length;

      } catch (error: any) {
        console.error(`   ❌ Error generating trivia for session ${session.id}:`, error.message);
        errors.push(`Session ${session.id} (${session.member.firstName}): ${error.message}`);
        
        // Create fallback trivia so session is marked as "done"
        try {
          await prisma.triviaItem.create({
            data: {
              quizId: quizId,
              sessionId: session.id,
              memberId: session.memberId,
              type: 'INSIGHT',
              title: `📊 ${session.member.firstName}'s Quiz Summary`,
              content: `You completed ${quiz.title}.\n\nScore: ${session.answers.filter((a: any) => a.isCorrect).length}/${session.answers.length}\n\nReview your answers and prepare for camp quiz!`,
              isPublished: true,
              publishedAt: new Date(),
              priority: 1,
              adminId: decoded.id
            }
          });
        } catch (fallbackError) {
          console.error(`   ❌ Even fallback failed:`, fallbackError);
        }
        
        continue;
      }
    }

    // Get remaining sessions without trivia
    const remainingCount = await prisma.quizSession.count({
      where: {
        quizId: quizId,
        isSubmitted: true,
        triviaItems: {
          none: {}
        }
      }
    });


    return NextResponse.json({
      success: true,
      message: remainingCount > 0
        ? `Generated trivia for ${generatedCount} members. ${remainingCount} still pending. Click again to continue.`
        : `All trivia generated successfully!`,
      generated: generatedCount,
      totalItems: totalTriviaItems,
      total: sessionsNeedingTrivia.length,
      remaining: remainingCount,
      errors
    });

  } catch (error: any) {
    console.error('❌ Fatal error in generate-trivia:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}