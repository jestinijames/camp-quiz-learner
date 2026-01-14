/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get all submitted quiz sessions for this member (only from active quizzes)
    const sessions = await prisma.quizSession.findMany({
      where: {
        memberId: member.id,
        isSubmitted: true,
        QuizInstance: {
          isActive: true // Only show reviews from active quizzes
        }
      },
      include: {
        QuizInstance: {
          include: { 
            BibleBook: true,
            Question: true // Get all questions in the quiz pool
          }
        },
        Answer: {
          include: {
            Question: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Format response with their answers + questions others got
    const reviewData = await Promise.all(sessions.map(async (session) => {
      const myQuestionIds = session.Answer.map(a => a.questionId);
      
      // Get questions from the pool that this user didn't get
      const otherQuestions = session.QuizInstance.Question
        .filter(q => !myQuestionIds.includes(q.id))
        .slice(0, 10); // Limit to 10 questions

      return {
        sessionId: session.id,
        quizTitle: session.QuizInstance.title,
        bookName: session.QuizInstance.BibleBook.name,
        reference: `${session.QuizInstance.fromChapter}:${session.QuizInstance.fromVerse} - ${session.QuizInstance.toChapter}:${session.QuizInstance.toVerse}`,
        completedAt: session.completedAt,
        totalScore: session.totalScore,
        // Their own answers
        myAnswers: session.Answer.map(a => ({
          questionText: a.Question.text,
          questionType: a.Question.type,
          myAnswer: a.response,
          correctAnswer: a.Question.answer,
          isCorrect: a.isCorrect,
          points: a.points,
          feedback: a.feedback,
          verseRef: a.Question.verseRef,
          options: a.Question.options ? JSON.parse(a.Question.options) : null
        })),
        // Questions others got (for learning)
        otherQuestions: otherQuestions.map(q => ({
          text: q.text,
          type: q.type,
          answer: q.answer,
          verseRef: q.verseRef,
          options: q.options ? JSON.parse(q.options) : null
        }))
      };
    }));

    return NextResponse.json(reviewData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching quiz review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
