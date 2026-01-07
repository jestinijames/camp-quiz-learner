/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../../lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Member access only' }, { status: 403 });
    }

    const { quizId } = await context.params;
    const quizInstanceId = parseInt(quizId);

    // Get quiz instance
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizInstanceId },
      include: {
        book: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: 'Quiz is not active' }, { status: 400 });
    }

    // Check if user already has a session for this quiz (including submitted ones)
    let session = await prisma.quizSession.findUnique({
      where: {
        quizId_memberId: {
          quizId: quizInstanceId,
          memberId: decoded.id
        }
      }
    });

    // If already submitted, don't allow retaking
    if (session?.isSubmitted) {
      return NextResponse.json({ error: 'Quiz already submitted' }, { status: 400 });
    }

    // Get existing question assignments for this quiz to enable team-aware distribution
    const existingUsages = await prisma.questionUsage.findMany({
      where: { session: { quizId: quizInstanceId } },
      select: {
        questionId: true,
        session: {
          select: {
            memberId: true,
            member: { select: { teamId: true } }
          }
        }
      }
    });

    // Build team assignment map for each question type
    const teamAssignments = new Map<number, { questionId: number; teamId: number }>();
    existingUsages.forEach(usage => {
      if (usage.session.member.teamId !== null) {
        teamAssignments.set(usage.session.memberId, {
          questionId: usage.questionId,
          teamId: usage.session.member.teamId
        });
      }
    });

    // Helper function to select question avoiding same-team duplicates
    const selectQuestionForTeam = (
      questions: any[],
      questionType: string,
      teamId: number,
      memberId: number
    ): any => {
      if (questions.length === 0) {
        throw new Error(`No ${questionType} questions available`);
      }

      // Get question IDs already used by this team
      const teamUsedQuestions = new Set<number>();
      for (const [_, assignment] of teamAssignments.entries()) {
        if (assignment.teamId === teamId) {
          teamUsedQuestions.add(assignment.questionId);
        }
      }

      // Find questions not used by this team
      const availableQuestions = questions.filter(q => !teamUsedQuestions.has(q.id));

      // If we have unused questions, pick randomly from them
      if (availableQuestions.length > 0) {
        return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      }

      // If all questions used by team, just pick random from full pool
      // (This should rarely happen with 15 questions and ~20 members per team)
      return questions[Math.floor(Math.random() * questions.length)];
    };

    // Get all questions of each type for smart selection
    const fillInBlankQuestions = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'FILL_IN_BLANK'
      }
    });

    const multipleChoiceQuestions = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'MULTIPLE_CHOICE'
      }
    });

    const descriptiveQuestions = await prisma.question.findMany({
      where: {
        quizId: quizInstanceId,
        type: 'DESCRIPTIVE'
      }
    });

    // Select 1 question of each type using team-aware logic
    const fillInBlank = selectQuestionForTeam(fillInBlankQuestions, 'FILL_IN_BLANK', decoded.teamId, decoded.id);
    const multipleChoice = selectQuestionForTeam(multipleChoiceQuestions, 'MULTIPLE_CHOICE', decoded.teamId, decoded.id);
    const descriptive = selectQuestionForTeam(descriptiveQuestions, 'DESCRIPTIVE', decoded.teamId, decoded.id);

    const selectedQuestions = [fillInBlank, multipleChoice, descriptive].filter(Boolean);

    if (selectedQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 400 });
    }

    // Use a transaction to ensure atomic operations
    if (!session) {
      // No session exists, create a new one
      try {
        session = await prisma.$transaction(async (tx) => {
          const newSession = await tx.quizSession.create({
            data: {
              quizId: quizInstanceId,
              memberId: decoded.id,
              startTime: new Date(),
              isSubmitted: false
            }
          });

          // Record which questions were assigned to this session
          await tx.questionUsage.createMany({
            data: selectedQuestions.map(q => ({
              sessionId: newSession.id,
              questionId: q.id
            }))
          });

          return newSession;
        });
      } catch (error: any) {
        // If unique constraint failed, session was created by another request - fetch it
        if (error.code === 'P2002') {
          session = await prisma.quizSession.findUnique({
            where: {
              quizId_memberId: {
                quizId: quizInstanceId,
                memberId: decoded.id
              }
            }
          });
          
          // If it was submitted in the meantime, return error
          if (session?.isSubmitted) {
            return NextResponse.json({ error: 'Quiz already submitted' }, { status: 400 });
          }
          
          // If session still not found, something went wrong
          if (!session) {
            return NextResponse.json({ error: 'Failed to create or retrieve session' }, { status: 500 });
          }
        } else {
          throw error;
        }
      }
    } else {
      // Incomplete session exists - use transaction to delete old and create new atomically
      await prisma.$transaction(async (tx) => {
        // Delete all old question usages for this session
        await tx.questionUsage.deleteMany({
          where: { sessionId: session!.id }
        });

        // Reset the session start time
        await tx.quizSession.update({
          where: { id: session!.id },
          data: {
            startTime: new Date(),
            isSubmitted: false
          }
        });

        // Assign new random questions (exactly 3)
        await tx.questionUsage.createMany({
          data: selectedQuestions.map(q => ({
            sessionId: session!.id,
            questionId: q.id
          }))
        });
      });
    }

    // At this point, session should always exist
    if (!session) {
      return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
    }

    // Get the assigned questions for response
    const usages = await prisma.questionUsage.findMany({
      where: { sessionId: session.id },
      include: { question: true }
    });

    const questionsForResponse = usages.map(u => u.question);

    return NextResponse.json({
      session: {
        id: session.id,
        startedAt: session.startTime
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        book: quiz.book,
        fromChapter: quiz.fromChapter,
        fromVerse: quiz.fromVerse,
        toChapter: quiz.toChapter,
        toVerse: quiz.toVerse,
        timeLimit: quiz.timeLimit,
        questions: questionsForResponse.map(q => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options,
          points: q.points,
          order: q.order
        }))
      }
    });

  } catch (error: any) {
    console.error('Error starting quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to start quiz' }, { status: 500 });
  }
}
