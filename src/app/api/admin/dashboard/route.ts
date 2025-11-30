/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';

export async function GET() {
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

    // Get total counts
    const totalQuizzes = await prisma.quizInstance.count();
    const totalMembers = await prisma.member.count();
    const totalTeams = await prisma.team.count();
    const activeQuizzes = await prisma.quizInstance.count({
      where: { isActive: true }
    });

    // Get recent quiz sessions
    const recentSessions = await prisma.quizSession.findMany({
      take: 10,
      orderBy: { startTime: 'desc' },
      include: {
        member: {
          include: { team: true }
        },
        quiz: {
          include: { book: true }
        }
      }
    });

    // Get quizzes needing correction
    const quizzesNeedingCorrection = await prisma.quizInstance.findMany({
      where: {
        quizSessions: {
          some: {
            isSubmitted: true,
            answers: {
              some: {
                question: { type: 'DESCRIPTIVE' },
                OR: [
                  { points: null },                    // Completely uncorrected
                  { 
                    AND: [
                      { points: 0 },                   // Scored as 0
                      { isCorrect: null }             // But not manually reviewed
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      include: {
        book: true
      },
      orderBy: { startDate: 'desc' } // CHANGED: Use startDate instead of createdAt
    });

    // Get detailed stats for each quiz needing correction
    const correctionStats = await Promise.all(
      quizzesNeedingCorrection.map(async (quiz) => {
        const totalSessions = await prisma.quizSession.count({
          where: { 
            quizId: quiz.id,
            isSubmitted: true 
          }
        });

        const sessionsNeedingCorrection = await prisma.quizSession.count({
          where: {
            quizId: quiz.id,
            isSubmitted: true,
            answers: {
              some: {
                question: { type: 'DESCRIPTIVE' },
                points: null
              }
            }
          }
        });

        const uncorrectedAnswers = await prisma.answer.count({
          where: {
            session: { quizId: quiz.id },
            question: { type: 'DESCRIPTIVE' },
            OR: [
              { points: null },
              { 
                AND: [
                  { points: 0 },
                  { isCorrect: null }
                ]
              }
            ]
          }
        });

        return {
          ...quiz,
          totalSessions,
          sessionsNeedingCorrection,
          uncorrectedAnswers
        };
      })
    );

    // Add this to your dashboard API temporarily:
    const testQueries = {
      totalQuizSessions: await prisma.quizSession.count(),
      submittedSessions: await prisma.quizSession.count({ where: { isSubmitted: true } }),
      totalAnswers: await prisma.answer.count(),
      descriptiveAnswers: await prisma.answer.count({
        where: { question: { type: 'DESCRIPTIVE' } }
      }),
      uncorrectedDescriptive: await prisma.answer.count({
        where: {
          question: { type: 'DESCRIPTIVE' },
          OR: [
            { points: null },
            { 
              AND: [
                { points: 0 },
                { isCorrect: null }
              ]
            }
          ]
        }
      }),
      descriptiveWithZeroPoints: await prisma.answer.count({
        where: {
          question: { type: 'DESCRIPTIVE' },
          points: 0,
          isCorrect: null
        }
      })
    };

    console.log('🔢 Test queries result:', testQueries);

    console.log('Dashboard API - Quizzes needing correction:', correctionStats.length);
    console.log('Total sessions found:', recentSessions.length);

    return NextResponse.json({
      stats: {
        totalQuizzes,
        totalMembers,
        totalTeams,
        activeQuizzes
      },
      recentSessions,
      quizzesNeedingCorrection: correctionStats.filter(q => q.uncorrectedAnswers > 0)
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}