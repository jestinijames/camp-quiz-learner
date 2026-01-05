/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(token) as { id: number; isAdmin: boolean };
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const teamFilter = searchParams.get('team');
    const memberFilter = searchParams.get('member');
    const activityType = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const activities: any[] = [];

    // 1. Quiz Submissions
    const quizSessions = await prisma.quizSession.findMany({
      where: {
        isSubmitted: true,
        completedAt: {
          not: null,
        },
        ...(memberFilter ? { memberId: parseInt(memberFilter) } : {}),
        ...(dateFrom || dateTo ? {
          completedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        member: {
          include: {
            team: true
          }
        },
        quiz: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    quizSessions.forEach(session => {
      if (teamFilter && session.member.team?.name !== teamFilter) return;
      if (activityType && activityType !== 'quiz') return;

      activities.push({
        id: `quiz-${session.id}`,
        type: 'Quiz',
        member: `${session.member.firstName} ${session.member.lastName}`,
        memberId: session.member.id,
        team: session.member.team?.name || 'No Team',
        teamId: session.member.teamId,
        activity: `${session.quiz.title} (${session.quiz.book.name})`,
        details: `Score: ${session.totalScore} | Time: ${session.timeSpent}s`,
        pointsAwarded: session.totalScore || 0,
        timestamp: session.completedAt,
        icon: '📝'
      });
    });

    // 2. Wordle Attempts
    const wordleAttempts = await prisma.wordleAttempt.findMany({
      where: {
        completed: true,
        completedAt: {
          not: null,
        },
        ...(memberFilter ? { memberId: parseInt(memberFilter) } : {}),
        ...(dateFrom || dateTo ? {
          completedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        member: {
          include: {
            team: true
          }
        },
        wordle: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    wordleAttempts.forEach(attempt => {
      if (teamFilter && attempt.member.team?.name !== teamFilter) return;
      if (activityType && activityType !== 'wordle') return;

      activities.push({
        id: `wordle-${attempt.id}`,
        type: 'Wordle',
        member: `${attempt.member.firstName} ${attempt.member.lastName}`,
        memberId: attempt.member.id,
        team: attempt.member.team?.name || 'No Team',
        teamId: attempt.member.teamId,
        activity: `${attempt.wordle.title} (${attempt.wordle.book.name})`,
        details: `${attempt.won ? '✅ Won' : '❌ Lost'} in ${attempt.attempts} attempts | Word: ${attempt.assignedWord} | Points: ${attempt.points}`,
        pointsAwarded: attempt.points,
        timestamp: attempt.completedAt,
        icon: '🎯'
      });
    });

    // 3. Emoji Attempts
    const emojiAttempts = await prisma.emojiAttempt.findMany({
      where: {
        completed: true,
        completedAt: {
          not: null,
        },
        ...(memberFilter ? { memberId: parseInt(memberFilter) } : {}),
        ...(dateFrom || dateTo ? {
          completedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        member: {
          include: {
            team: true
          }
        },
        game: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    emojiAttempts.forEach(attempt => {
      if (teamFilter && attempt.member.team?.name !== teamFilter) return;
      if (activityType && activityType !== 'emoji') return;

      const assignedEmoji = JSON.parse(attempt.assignedEmoji);
      activities.push({
        id: `emoji-${attempt.id}`,
        type: 'Emoji Game',
        member: `${attempt.member.firstName} ${attempt.member.lastName}`,
        memberId: attempt.member.id,
        team: attempt.member.team?.name || 'No Team',
        teamId: attempt.member.teamId,
        activity: `${attempt.game.title} (${attempt.game.book.name})`,
        details: `${attempt.isCorrect ? '✅ Correct' : '❌ Wrong'} | Answer: ${attempt.answer} | Correct: ${assignedEmoji.verse} | Points: ${attempt.points}`,
        pointsAwarded: attempt.points,
        timestamp: attempt.completedAt,
        icon: '😊'
      });
    });

    // 4. Reading Passage Completions (listening marker cards)
    const listeningCards = await prisma.collaborationCard.findMany({
      where: {
        content: '__LISTENING_COMPLETION__',
        ...(memberFilter ? { authorId: parseInt(memberFilter) } : {}),
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        author: {
          include: {
            team: true
          }
        },
        wallSession: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    listeningCards.forEach(card => {
      if (teamFilter && card.author.team?.name !== teamFilter) return;
      if (activityType && activityType !== 'reading') return;

      // Check if points were awarded (pointsAwarded field)
      // Note: We need to check the actual points from the database or assume based on logic
      // pointsAwarded=true means full 4 points, false could mean 0 or 1 (skipped)
      // For now, we'll show 4 for completed, and will need to track skip vs incomplete differently
      const points = card.pointsAwarded ? 4 : 1; // Assume skipped if pointsAwarded=false (user clicked button)
      const status = card.pointsAwarded ? '✅ Completed' : '📝 Read';

      activities.push({
        id: `reading-${card.id}`,
        type: 'Read Passage',
        member: `${card.author.firstName} ${card.author.lastName}`,
        memberId: card.author.id,
        team: card.author.team?.name || 'No Team',
        teamId: card.author.teamId,
        activity: `${card.wallSession.title} (${card.wallSession.book.name})`,
        details: `${status} | ${card.wallSession.book.name} ${card.wallSession.fromChapter}:${card.wallSession.fromVerse} - ${card.wallSession.toChapter}:${card.wallSession.toVerse} | Points: ${points}`,
        pointsAwarded: points,
        timestamp: card.createdAt,
        icon: '📖'
      });
    });

    // 5. First Collaboration Insights (pointsAwarded = true)
    const insightCards = await prisma.collaborationCard.findMany({
      where: {
        pointsAwarded: true,
        content: {
          not: '__LISTENING_COMPLETION__'
        },
        ...(memberFilter ? { authorId: parseInt(memberFilter) } : {}),
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        author: {
          include: {
            team: true
          }
        },
        wallSession: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    insightCards.forEach(card => {
      if (teamFilter && card.author.team?.name !== teamFilter) return;
      if (activityType && activityType !== 'insight') return;

      activities.push({
        id: `insight-${card.id}`,
        type: 'Shared Insight',
        member: `${card.author.firstName} ${card.author.lastName}`,
        memberId: card.author.id,
        team: card.author.team?.name || 'No Team',
        teamId: card.author.teamId,
        activity: `${card.wallSession.title}`,
        details: card.content.substring(0, 100) + (card.content.length > 100 ? '...' : ''),
        pointsAwarded: 2, // Fixed 2 points for first insight
        timestamp: card.createdAt,
        icon: '✨'
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    // Calculate summary statistics
    const summary = {
      totalActivities: activities.length,
      totalPoints: activities.reduce((sum, a) => sum + a.pointsAwarded, 0),
      byType: {
        quiz: activities.filter(a => a.type === 'Quiz').length,
        wordle: activities.filter(a => a.type === 'Wordle').length,
        emoji: activities.filter(a => a.type === 'Emoji Game').length,
        reading: activities.filter(a => a.type === 'Read Passage').length,
        insight: activities.filter(a => a.type === 'Shared Insight').length,
      },
      byTeam: {} as Record<string, number>
    };

    // Group points by team
    activities.forEach(a => {
      if (!summary.byTeam[a.team]) {
        summary.byTeam[a.team] = 0;
      }
      summary.byTeam[a.team] += a.pointsAwarded;
    });

    return NextResponse.json({
      activities,
      summary
    });

  } catch (error: any) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
}
