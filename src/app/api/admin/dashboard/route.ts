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

    // FIXED: Parse wordPool and show stats
    let activeWordleInfo = null;
    if (activeWordle) {
      try {
        const wordPool = JSON.parse(activeWordle.wordPool);
        activeWordleInfo = {
          id: activeWordle.id,
          title: activeWordle.title,
          wordPool: wordPool, // Send full word pool for admin
          wordPoolSize: wordPool.length,
          bookName: activeWordle.book.name,
          reference: `${activeWordle.book.name} ${activeWordle.fromChapter}:${activeWordle.fromVerse}-${activeWordle.toChapter}:${activeWordle.toVerse}`,
          attempts: totalWordleAttempts,
          completions: totalWordleWins
        };
      } catch (error) {
        console.error('Error parsing wordPool:', error);
        activeWordleInfo = {
          id: activeWordle.id,
          title: activeWordle.title,
          wordPoolSize: 0,
          bookName: activeWordle.book.name,
          attempts: totalWordleAttempts
        };
      }
    }

    // New: Fetch and structure emoji game data
    const emojiGames = await prisma.emojiGame.findMany({
      include: {
        book: true,
        emojiAttempts: true
      },
      orderBy: { createdDate: 'desc' }
    });

    const emojiGameData = emojiGames.map(game => {
      const puzzlePool = JSON.parse(game.emojiPool);
      return {
        id: game.id,
        title: game.title,
        bookName: game.book.name,
        passage: `${game.fromChapter}:${game.fromVerse}-${game.toChapter}:${game.toVerse}`,
        puzzleCount: puzzlePool.length,
        totalAttempts: game.emojiAttempts.length,
        completedAttempts: game.emojiAttempts.filter((a: any) => a.completed).length,
        isActive: game.isActive,
        createdDate: game.createdDate
      };
    });

    // Get collaboration walls
    const collaborationWalls = await prisma.collaborationWallSession.findMany({
      include: {
        book: true,
        _count: {
          select: { 
            cards: {
              where: {
                content: {
                  not: '__LISTENING_COMPLETION__' // Exclude marker cards from count
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch Verse Drop games
    const verseDropGames = await prisma.verseDropGame.findMany({
      include: {
        book: true,
        verseDropAttempts: true
      },
      orderBy: { createdDate: 'desc' }
    });

    const verseDropGameData = verseDropGames.map(game => {
      const versePool = JSON.parse(game.versePool);
      return {
        id: game.id,
        title: game.title,
        book: game.book,
        fromChapter: game.fromChapter,
        fromVerse: game.fromVerse,
        toChapter: game.toChapter,
        toVerse: game.toVerse,
        timeLimit: game.timeLimit,
        verseCount: versePool.length,
        verseDropAttempts: game.verseDropAttempts,
        totalAttempts: game.verseDropAttempts.length,
        completedAttempts: game.verseDropAttempts.filter((a: any) => a.completedAt).length,
        isActive: game.isActive,
        createdDate: game.createdDate
      };
    });

    return NextResponse.json({
      stats: {
        totalQuizzes,
        totalMembers,
        totalTeams,
        activeQuizzes,
        totalWordles,
        activeWordle: activeWordleInfo,
        totalWordleAttempts,
        wordleWinRate: totalWordleAttempts > 0 
          ? Math.round((totalWordleWins / totalWordleAttempts) * 100) 
          : 0
      },
      recentSessions,
      recentWordleAttempts,
      quizzesNeedingCorrection: correctionStats.filter(q => q.uncorrectedAnswers > 0),
      allQuizzes: allQuizStats,
      allWordles,
      emojiGames: emojiGameData,
      verseDropGames: verseDropGameData,
      collaborationWalls
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}