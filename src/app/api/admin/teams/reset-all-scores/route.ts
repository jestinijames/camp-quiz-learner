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

    console.log('Starting scoreboard reset...');

    // Delete all game attempts and reset scores in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete child records first to avoid foreign key constraints
      
      console.log('Step 1: Deleting TriviaViews...');
      const deletedTriviaViews = await tx.triviaView.deleteMany({});
      console.log('Deleted TriviaViews:', deletedTriviaViews.count);
      
      console.log('Step 2: Deleting TriviaItems...');
      const deletedTriviaItems = await tx.triviaItem.deleteMany({});
      console.log('Deleted TriviaItems:', deletedTriviaItems.count);
      
      console.log('Step 3: Deleting Answers...');
      const deletedAnswers = await tx.answer.deleteMany({});
      console.log('Deleted Answers:', deletedAnswers.count);
      
      console.log('Step 4: Deleting QuestionUsages...');
      const deletedQuestionUsages = await tx.questionUsage.deleteMany({});
      console.log('Deleted QuestionUsages:', deletedQuestionUsages.count);
      
      console.log('Step 5: Deleting QuizSessions...');
      const deletedQuizSessions = await tx.quizSession.deleteMany({});
      console.log('Deleted QuizSessions:', deletedQuizSessions.count);
      
      console.log('Step 6: Deleting WordleAttempts...');
      const deletedWordleAttempts = await tx.wordleAttempt.deleteMany({});
      console.log('Deleted WordleAttempts:', deletedWordleAttempts.count);
      
      console.log('Step 7: Deleting EmojiAttempts...');
      const deletedEmojiAttempts = await tx.emojiAttempt.deleteMany({});
      console.log('Deleted EmojiAttempts:', deletedEmojiAttempts.count);
      
      console.log('Step 8: Deleting VerseDropAttempts...');
      const deletedVerseDropAttempts = await tx.verseDropAttempt.deleteMany({});
      console.log('Deleted VerseDropAttempts:', deletedVerseDropAttempts.count);
      
      console.log('Step 9: Deleting FlipAttempts...');
      const deletedFlipAttempts = await tx.flipAttempt.deleteMany({});
      console.log('Deleted FlipAttempts:', deletedFlipAttempts.count);
      
      console.log('Step 10: Resetting CollaborationCards pointsAwarded...');
      const resetCollaborationCards = await tx.collaborationCard.updateMany({
        data: { pointsAwarded: false }
      });
      console.log('Reset CollaborationCards:', resetCollaborationCards.count);
      
      console.log('Step 11: Resetting Teams manualPoints...');
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
    }, {
      maxWait: 30000, // 30 seconds max wait
      timeout: 60000, // 60 seconds timeout
    });

    console.log('Transaction completed successfully');

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
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset all scores', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
