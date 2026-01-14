import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        Member: {
          include: {
            QuizSession: {
              where: { isSubmitted: true },
              select: { totalScore: true }
            },
            WordleAttempt: {
              where: { completed: true },
              select: { points: true }
            },
            EmojiAttempt: {
              where: { completed: true },
              select: { points: true }
            },
            VerseDropAttempt: {
              where: { completed: true },
              select: { points: true }
            },
            FlipAttempt: {
              where: { completed: true },
              select: { points: true }
            },
            CollaborationCard: {
              select: { 
                content: true,
                pointsAwarded: true 
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calculate team scores
    const teamStats = teams.map(team => {
      const quizPoints = team.Member.reduce((total, member) => {
        const memberQuizScore = member.QuizSession.reduce((sum, session) => 
          sum + (session.totalScore || 0), 0
        );
        return total + memberQuizScore;
      }, 0);

      const wordlePoints = team.Member.reduce((total, member) => {
        const memberWordleScore = member.WordleAttempt.reduce((sum, attempt) => 
          sum + attempt.points, 0
        );
        return total + memberWordleScore;
      }, 0);

      const emojiPoints = team.Member.reduce((total, member) => {
        const memberEmojiScore = member.EmojiAttempt.reduce((sum, attempt) => 
          sum + attempt.points, 0
        );
        return total + memberEmojiScore;
      }, 0);

      const verseDropPoints = team.Member.reduce((total, member) => {
        const memberVerseDropScore = member.VerseDropAttempt.reduce((sum, attempt) => 
          sum + attempt.points, 0
        );
        return total + memberVerseDropScore;
      }, 0);

      const flipPoints = team.Member.reduce((total, member) => {
        const memberFlipScore = member.FlipAttempt.reduce((sum, attempt) => 
          sum + attempt.points, 0
        );
        return total + memberFlipScore;
      }, 0);

      const readingPoints = team.Member.reduce((total, member) => {
        // Reading passages: 4 points for completion, 1 point for skipped (only if awarded)
        const completedReading = member.CollaborationCard
          .filter(card => card.content === '__LISTENING_COMPLETION__' && card.pointsAwarded)
          .length * 4;
        const skippedReading = member.CollaborationCard
          .filter(card => card.content === '__LISTENING_SKIPPED__' && card.pointsAwarded)
          .length * 1;
        return total + completedReading + skippedReading;
      }, 0);

      const insightPoints = team.Member.reduce((total, member) => {
        // Insights: 2 points each for collaboration cards that got points (excluding reading markers)
        const memberInsightScore = member.CollaborationCard
          .filter(card => 
            card.pointsAwarded && 
            card.content !== '__LISTENING_COMPLETION__' && 
            card.content !== '__LISTENING_SKIPPED__'
          )
          .length * 2;
        return total + memberInsightScore;
      }, 0);

      return {
        id: team.id,
        name: team.name,
        totalScore: quizPoints + wordlePoints + emojiPoints + verseDropPoints + flipPoints + readingPoints + insightPoints + (team.manualPoints || 0),
        quizScore: quizPoints,
        wordleScore: wordlePoints,
        emojiScore: emojiPoints,
        verseDropScore: verseDropPoints,
        flipScore: flipPoints,
        readingScore: readingPoints,
        insightScore: insightPoints,
        manualPoints: team.manualPoints || 0,
        memberCount: team.Member.length,
        members: team.Member.length
      };
    });

    // Sort by total score (highest first)
    teamStats.sort((a, b) => b.totalScore - a.totalScore);

    return NextResponse.json(teamStats);
  } catch (error) {
    console.error('Error fetching team scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team scores' },
      { status: 500 }
    );
  }
}