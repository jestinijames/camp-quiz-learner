/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
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

    // First, close the quiz
    const updatedQuiz = await prisma.quizInstance.update({
      where: { id: quizId },
      data: {
        isActive: false,
        endDate: new Date()
      },
      include: { 
        book: true,
        quizSessions: {
          where: { isSubmitted: true },
          include: {
            member: {
              include: { team: true }
            },
            answers: {
              include: { question: true }
            }
          }
        }
      }
    });

    let totalTriviaGenerated = 0;

    console.log(`Found ${updatedQuiz.quizSessions.length} completed sessions for quiz ${quizId}`);

    // Generate simplified trivia for each participant  
    for (const session of updatedQuiz.quizSessions) {
      try {
        console.log(`Generating simple review trivia for ${session.member.name}...`);

        // Use simplified trivia generation
        const triviaItems = await generatePersonalizedTrivia(
          session.member.name,
          session.member.team.name,
          session.answers,
          updatedQuiz,
          prisma
        );

        console.log(`Generated ${triviaItems.length} trivia items for ${session.member.name}`);

        // Save each trivia item
        for (const item of triviaItems) {
          await prisma.triviaItem.create({
            data: {
              quizId: quizId,
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

        totalTriviaGenerated += triviaItems.length;
        console.log(`Saved ${triviaItems.length} trivia items for ${session.member.name}`);

      } catch (error: any) {
        console.error(`Error generating trivia for ${session.member.name}:`, error);
        
        // Simple fallback - just show their score
        await prisma.triviaItem.create({
          data: {
            quizId: quizId,
            memberId: session.memberId,
            type: 'INSIGHT',
            title: `📊 ${session.member.name}'s Quiz Review`,
            content: `You completed ${updatedQuiz.title}.\n\nScore: ${session.answers.filter((a: any) => a.isCorrect).length}/${session.answers.length}\n\nReview your answers and prepare for camp quiz!`,
            isPublished: true,
            publishedAt: new Date(),
            priority: 1,
            adminId: decoded.id
          }
        });
        
        totalTriviaGenerated += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quiz "${updatedQuiz.title}" closed and trivia generated`,
      quiz: {
        id: updatedQuiz.id,
        title: updatedQuiz.title,
        participants: updatedQuiz.quizSessions.length,
        endDate: updatedQuiz.endDate
      },
      triviaGenerated: {
        total: totalTriviaGenerated,
        participants: updatedQuiz.quizSessions.length
      }
    });

  } catch (error: any) {
    console.error('Error closing quiz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}