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

    // Get all submitted quiz sessions for this member
    const sessions = await prisma.quizSession.findMany({
      where: {
        memberId: member.id,
        isSubmitted: true
      },
      include: {
        quiz: {
          include: { 
            book: true,
            questions: true // Get all questions in the quiz pool
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Format response with their answers + questions others got
    const reviewData = await Promise.all(sessions.map(async (session) => {
      const myQuestionIds = session.answers.map(a => a.questionId);
      
      // Get questions from the pool that this user didn't get
      const otherQuestions = session.quiz.questions
        .filter(q => !myQuestionIds.includes(q.id))
        .slice(0, 10); // Limit to 10 questions

      return {
        sessionId: session.id,
        quizTitle: session.quiz.title,
        bookName: session.quiz.book.name,
        reference: `${session.quiz.fromChapter}:${session.quiz.fromVerse} - ${session.quiz.toChapter}:${session.quiz.toVerse}`,
        completedAt: session.completedAt,
        totalScore: session.totalScore,
        // Their own answers
        myAnswers: session.answers.map(a => ({
          questionText: a.question.text,
          questionType: a.question.type,
          myAnswer: a.response,
          correctAnswer: a.question.answer,
          isCorrect: a.isCorrect,
          points: a.points,
          feedback: a.feedback,
          verseRef: a.question.verseRef,
          options: a.question.options ? JSON.parse(a.question.options) : null
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

    return NextResponse.json(reviewData);

  } catch (error: any) {
    console.error('❌ Error fetching quiz review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
