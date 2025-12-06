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

    // Get Wordle stats
    const totalWordles = await prisma.wordleInstance.count();
    const activeWordle = await prisma.wordleInstance.findFirst({
      where: { isActive: true },
      include: { book: true }
    });
    const totalWordleAttempts = await prisma.wordleAttempt.count({
      where: { completed: true }
    });
    const totalWordleWins = await prisma.wordleAttempt.count({
      where: { 
        completed: true,
        won: true 
      }
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

    // Get recent Wordle attempts
    const recentWordleAttempts = await prisma.wordleAttempt.findMany({
      take: 10,
      orderBy: { completedAt: 'desc' },
      include: {
        member: {
          include: { team: true }
        },
        wordle: {
          include: { book: true }
        }
      }
    });

    // FIXED: Get quizzes needing correction - consistent query
    const quizzesNeedingCorrection = await prisma.quizInstance.findMany({
      where: {
        quizSessions: {
          some: {
            isSubmitted: true,
            answers: {
              some: {
                question: { type: 'DESCRIPTIVE' },
                feedback: 'Awaiting manual review'
              }
            }
          }
        }
      },
      include: {
        book: true
      },
      orderBy: { startDate: 'desc' }
    });

    // FIXED: Get detailed stats using the same criteria
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
                feedback: 'Awaiting manual review'
              }
            }
          }
        });

        const uncorrectedAnswers = await prisma.answer.count({
          where: {
            session: { 
              quizId: quiz.id,
              isSubmitted: true 
            },
            question: { type: 'DESCRIPTIVE' },
            feedback: 'Awaiting manual review'
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

    // Get ALL quizzes for management
    const allQuizzes = await prisma.quizInstance.findMany({
      include: {
        book: true,
        quizSessions: {
          where: { isSubmitted: true },
          include: {
            member: { include: { team: true } }
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    // FIXED: Calculate stats for all quizzes using consistent criteria
    const allQuizStats = await Promise.all(
      allQuizzes.map(async (quiz) => {
        const totalSessions = quiz.quizSessions.length;
        
        const uncorrectedAnswers = await prisma.answer.count({
          where: {
            session: { 
              quizId: quiz.id,
              isSubmitted: true 
            },
            question: { type: 'DESCRIPTIVE' },
            feedback: 'Awaiting manual review'
          }
        });

        return {
          ...quiz,
          totalSessions,
          uncorrectedAnswers,
          needsCorrection: uncorrectedAnswers > 0
        };
      })
    );

    // Get all Wordles for management
    const allWordles = await prisma.wordleInstance.findMany({
      include: {
        book: true,
        wordleAttempts: {
          include: {
            member: { include: { team: true } }
          }
        }
      },
      orderBy: { createdDate: 'desc' }
    });

    console.log('Dashboard API - Quizzes needing correction:', correctionStats.length);
    console.log('Uncorrected answers found:', correctionStats.map(q => ({
      title: q.title,
      uncorrected: q.uncorrectedAnswers
    })));

    return NextResponse.json({
      stats: {
        totalQuizzes,
        totalMembers,
        totalTeams,
        activeQuizzes,
        totalWordles,
        activeWordle: activeWordle ? {
          id: activeWordle.id,
          title: activeWordle.title,
          word: activeWordle.word,
          book: activeWordle.book.name,
          attempts: totalWordleAttempts
        } : null,
        totalWordleAttempts,
        wordleWinRate: totalWordleWins
      },
      recentSessions,
      recentWordleAttempts,
      quizzesNeedingCorrection: correctionStats.filter(q => q.uncorrectedAnswers > 0),
      allQuizzes: allQuizStats,
      allWordles
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}