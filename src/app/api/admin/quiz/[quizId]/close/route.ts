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
    const errors: string[] = [];

    console.log(`Found ${updatedQuiz.quizSessions.length} completed sessions for quiz ${quizId}`);

    // Generate personalized trivia for each participant  
    for (const session of updatedQuiz.quizSessions) {
      try {
        console.log(`Generating educational trivia for ${session.member.name}...`);

        // Use our new educational trivia function
        const triviaItems = await generatePersonalizedTrivia(
          session.member.name,
          session.member.team.name,
          session.answers,
          updatedQuiz,
          prisma // ADD THIS - pass prisma instance
        );

        console.log(`Generated ${triviaItems.length} educational trivia items for ${session.member.name}`);

        if (triviaItems.length > 0) {
          for (const item of triviaItems) {
            await prisma.triviaItem.create({
              data: {
                quizId: quizId,
                memberId: session.memberId,
                // FIXED: Map new types to existing enum values
                type: item.type === 'WRONG_ANSWER_REVIEW' ? 'COMMON_MISTAKE' :
                      item.type === 'PERFORMANCE_INSIGHT' ? 'INSIGHT' :
                      item.type === 'COMPARATIVE_STATS' ? 'INSIGHT' :
                      item.type === 'IMPROVEMENT_TIP' ? 'STUDY_TIP' :
                      'BIBLICAL_CONNECTION',
                title: item.title,
                content: item.content,
                insight: item.personalNote || null,
                suggestedReading: item.verseReference || null,
                studyTips: item.studyAction || null,
                isPublished: true,
                publishedAt: new Date(),
                priority: item.type === 'WRONG_ANSWER_REVIEW' ? 1 : 2, // Wrong answers get highest priority
                adminId: decoded.id
              }
            });
          }

          totalTriviaGenerated += triviaItems.length;
          console.log(`Saved ${triviaItems.length} educational trivia items for ${session.member.name}`);
        }

      } catch (error: any) {
        // Fallback: Create simple review trivia
        const wrongAnswers = session.answers.filter((a: any) => a.isCorrect === false);
        const correctCount = session.answers.filter((a: any) => a.isCorrect === true).length;
        const totalCount = session.answers.length;
        
        await prisma.triviaItem.create({
          data: {
            quizId: quizId,
            memberId: session.memberId,
            type: 'INSIGHT',
            title: `📊 ${session.member.name}'s Quiz Results`,
            content: `You scored ${correctCount}/${totalCount} on ${updatedQuiz.title}.\n\n${wrongAnswers.length > 0 ? `Review these areas:\n${wrongAnswers.map((a: any) => `• ${a.question.text}`).join('\n')}` : 'Great job! You\'re ready for camp quiz!'}`,
            insight: `Focus on studying the areas you missed for camp quiz preparation.`,
            studyTips: `Re-read ${updatedQuiz.book.name} ${updatedQuiz.fromChapter}-${updatedQuiz.toChapter}`,
            suggestedReading: `${updatedQuiz.book.name} ${updatedQuiz.fromChapter}:${updatedQuiz.fromVerse}-${updatedQuiz.toChapter}:${updatedQuiz.toVerse}`,
            isPublished: true,
            publishedAt: new Date(),
            priority: 1,
            adminId: decoded.id
          }
        });
        
        totalTriviaGenerated += 1;
        console.log(`Created fallback trivia for ${session.member.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quiz "${updatedQuiz.title}" has been closed successfully`,
      quiz: {
        id: updatedQuiz.id,
        title: updatedQuiz.title,
        participants: updatedQuiz.quizSessions.length,
        endDate: updatedQuiz.endDate
      },
      triviaGenerated: {
        total: totalTriviaGenerated,
        participants: updatedQuiz.quizSessions.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error closing quiz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}