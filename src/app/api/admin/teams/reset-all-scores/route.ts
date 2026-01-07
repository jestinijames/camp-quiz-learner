/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import prisma from '../../../../../../lib/prisma';

export async function POST() {
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

    // Delete all game attempts and reset scores in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete child records first to avoid foreign key constraints
      
      // Delete all answers (child of QuizSession)
      const deletedAnswers = await tx.answer.deleteMany({});
      
      // Delete all question usages (child of QuizSession)
      const deletedQuestionUsages = await tx.questionUsage.deleteMany({});
      
      // Delete all trivia views (if they exist)
      const deletedTriviaViews = await tx.triviaView.deleteMany({});
      
      // Now delete parent records
      
      // Delete all quiz sessions
      const deletedQuizSessions = await tx.quizSession.deleteMany({});
      
      // Delete all wordle attempts
      const deletedWordleAttempts = await tx.wordleAttempt.deleteMany({});
      
      // Delete all emoji attempts
      const deletedEmojiAttempts = await tx.emojiAttempt.deleteMany({});
      
      // Delete all verse drop attempts
      const deletedVerseDropAttempts = await tx.verseDropAttempt.deleteMany({});
      
      // Reset collaboration cards' pointsAwarded flag (keep the cards, just reset points)
      const resetCollaborationCards = await tx.collaborationCard.updateMany({
        data: { pointsAwarded: false }
      });
      
      // Reset all teams' manual points to 0
      const resetTeams = await tx.team.updateMany({
        data: { manualPoints: 0 }
      });

      return {
        answers: deletedAnswers.count,
        questionUsages: deletedQuestionUsages.count,
        triviaViews: deletedTriviaViews.count,
        quizSessions: deletedQuizSessions.count,
        wordleAttempts: deletedWordleAttempts.count,
        emojiAttempts: deletedEmojiAttempts.count,
        verseDropAttempts: deletedVerseDropAttempts.count,
        collaborationCardsReset: resetCollaborationCards.count,
        teamsReset: resetTeams.count
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reset all scores and deleted all game attempts`,
      details: {
        teamsReset: result.teamsReset,
        deletedRecords: {
          answers: result.answers,
          questionUsages: result.questionUsages,
          triviaViews: result.triviaViews,
          quizSessions: result.quizSessions,
          wordleAttempts: result.wordleAttempts,
          emojiAttempts: result.emojiAttempts,
          verseDropAttempts: result.verseDropAttempts,
          total: result.answers + result.questionUsages + result.triviaViews +
                 result.quizSessions + result.wordleAttempts + result.emojiAttempts + 
                 result.verseDropAttempts
        },
        preserved: {
          collaborationCards: `${result.collaborationCardsReset} cards preserved (points reset)`
        }
      }
    });

  } catch (error: any) {
    console.error('Error resetting all scores:', error);
    return NextResponse.json(
      { error: 'Failed to reset all scores', details: error.message },
      { status: 500 }
    );
  }
}
