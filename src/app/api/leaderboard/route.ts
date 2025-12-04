import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            quizSessions: {
              where: { isSubmitted: true },
              select: { totalScore: true }
            },
            wordleAttempts: {
              select: { points: true }
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
      const quizPoints = team.members.reduce((total, member) => {
        const memberQuizScore = member.quizSessions.reduce((sum, session) => 
          sum + (session.totalScore || 0), 0
        );
        return total + memberQuizScore;
      }, 0);

      const wordlePoints = team.members.reduce((total, member) => {
        const memberWordleScore = member.wordleAttempts.reduce((sum, attempt) => 
          sum + attempt.points, 0
        );
        return total + memberWordleScore;
      }, 0);

      return {
        id: team.id,
        name: team.name,
        totalScore: quizPoints + wordlePoints, // Combined score
        quizScore: quizPoints,
        wordleScore: wordlePoints,
        memberCount: team.members.length,
        members: team.members.length
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