import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            quizSessions: {
              include: {
                answers: true
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
    const teamScores = teams.map(team => {
      const totalScore = team.members.reduce((teamTotal, member) => {
        const memberScore = member.quizSessions.reduce((memberTotal, session) => {
          const sessionScore = session.answers.reduce((sessionTotal, answer) => {
            return sessionTotal + (answer.points || 0);
          }, 0);
          return memberTotal + sessionScore;
        }, 0);
        return teamTotal + memberScore;
      }, 0);

      const totalQuizzes = team.members.reduce((total, member) => {
        return total + member.quizSessions.filter(session => session.completedAt).length;
      }, 0);

      return {
        id: team.id,
        name: team.name,
        memberCount: team.members.length,
        totalScore,
        completedQuizzes: totalQuizzes,
        averageScore: totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0
      };
    });

    // Sort by total score (highest first)
    teamScores.sort((a, b) => b.totalScore - a.totalScore);

    return NextResponse.json(teamScores);
  } catch (error) {
    console.error('Error fetching team scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team scores' },
      { status: 500 }
    );
  }
}