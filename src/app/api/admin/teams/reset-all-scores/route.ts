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
      
      // Delete all trivia views first (child of TriviaItem with ON DELETE RESTRICT)
      const deletedTriviaViews = await tx.triviaView.deleteMany({});
      console.log('Deleted TriviaViews:', deletedTriviaViews.count);
      
      // Delete all trivia items (references QuizSession, Question, etc.)
      const deletedTriviaItems = await tx.triviaItem.deleteMany({});
      console.log('Deleted TriviaItems:', deletedTriviaItems.count);
      
      // Delete all answers (child of QuizSession)
      const deletedAnswers = await tx.answer.deleteMany({});
      console.log('Deleted Answers:', deletedAnswers.count);
      
      // Delete all question usages (child of QuizSession)
      const deletedQuestionUsages = await tx.questionUsage.deleteMany({});
      console.log('Deleted QuestionUsages:', deletedQuestionUsages.count);
      
      // Now delete parent records
      
      // Delete all quiz sessions
      const deletedQuizSessions = await tx.quizSession.deleteMany({});
      console.log('Deleted QuizSessions:', deletedQuizSessions.count);
      
      // Delete all wordle attempts
      const deletedWordleAttempts = await tx.wordleAttempt.deleteMany({});
      console.log('Deleted WordleAttempts:', deletedWordleAttempts.count);
      
      // Delete all emoji attempts
      const deletedEmojiAttempts = await tx.emojiAttempt.deleteMany({});
      console.log('Deleted EmojiAttempts:', deletedEmojiAttempts.count);
      
      // Delete all verse drop attempts
      const deletedVerseDropAttempts = await tx.verseDropAttempt.deleteMany({});
      console.log('Deleted VerseDropAttempts:', deletedVerseDropAttempts.count);
      
      // Delete all flip attempts
      const deletedFlipAttempts = await tx.flipAttempt.deleteMany({});
      console.log('Deleted FlipAttempts:', deletedFlipAttempts.count);
      
      // Reset collaboration cards' pointsAwarded flag (keep the cards, just reset points)
      const resetCollaborationCards = await tx.collaborationCard.updateMany({
        data: { pointsAwarded: false }
      });
      console.log('Reset CollaborationCards:', resetCollaborationCards.count);
      
      // Reset all teams' manual points to 0
      const resetTeams = await tx.team.updateMany({
        data: { manualPoints: 0 }
      });
      console.log('Reset Teams manualPoints:', resetTeams.count);

      return {
        triviaViews: deletedTriviaViews.count,
        triviaItems: deletedTriviaItems.count,
        answers: deletedAnswers.count,
        questionUsages: deletedQuestionUsages.count,
        quizSessions: deletedQuizSessions.count,
        wordleAttempts: deletedWordleAttempts.count,
        emojiAttempts: deletedEmojiAttempts.count,
        verseDropAttempts: deletedVerseDropAttempts.count,
        flipAttempts: deletedFlipAttempts.count,
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
          triviaViews: result.triviaViews,
          triviaItems: result.triviaItems,
          answers: result.answers,
          questionUsages: result.questionUsages,
          quizSessions: result.quizSessions,
          wordleAttempts: result.wordleAttempts,
          emojiAttempts: result.emojiAttempts,
          verseDropAttempts: result.verseDropAttempts,
          flipAttempts: result.flipAttempts,
          total: result.triviaViews + result.triviaItems + result.answers + result.questionUsages + 
                 result.quizSessions + result.wordleAttempts + result.emojiAttempts + 
                 result.verseDropAttempts + result.flipAttempts
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
