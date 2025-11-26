import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';


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

    const teamsWithScores = teams.map(team => {
      const membersWithScores = team.members.map(member => {
        // Calculate member statistics
        const allAnswers = member.quizSessions.flatMap(session => session.answers);
        const totalQuestions = allAnswers.length;
        const correctAnswers = allAnswers.filter(answer => answer.score > 0).length;
        const wrongAnswers = totalQuestions - correctAnswers;
        const totalScore = allAnswers.reduce((sum, answer) => sum + answer.score, 0);
        const quizSessions = member.quizSessions.length;

        return {
          id: member.id,
          name: member.name,
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          totalScore,
          quizSessions
        };
      });

      // Calculate team statistics
      const totalTeamScore = membersWithScores.reduce((sum, member) => sum + member.totalScore, 0);
      const totalTeamQuestions = membersWithScores.reduce((sum, member) => sum + member.totalQuestions, 0);
      const totalTeamCorrect = membersWithScores.reduce((sum, member) => sum + member.correctAnswers, 0);
      const averageScore = totalTeamQuestions > 0 ? Math.round((totalTeamCorrect / totalTeamQuestions) * 100) : 0;

      return {
        id: team.id,
        name: team.name,
        totalMembers: team.members.length,
        totalTeamScore,
        averageScore,
        members: membersWithScores.sort((a, b) => b.totalScore - a.totalScore) // Sort by score descending
      };
    });

    // Sort teams by total score descending
    teamsWithScores.sort((a, b) => b.totalTeamScore - a.totalTeamScore);

    return NextResponse.json(teamsWithScores);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}