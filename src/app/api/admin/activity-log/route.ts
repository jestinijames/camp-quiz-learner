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
        Member: {
          include: {
            Team: true
          }
        },
        QuizInstance: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    quizSessions.forEach(session => {
      if (teamFilter && session.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'quiz') return;

      activities.push({
        id: `quiz-${session.id}`,
        type: 'Quiz',
        member: `${session.Member.firstName} ${session.Member.lastName}`,
        memberId: session.Member.id,
        team: session.Member.Team?.name || 'No Team',
        teamId: session.Member.teamId,
        activity: `${session.QuizInstance.title} (${session.QuizInstance.BibleBook.name})`,
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
        Member: {
          include: {
            Team: true
          }
        },
        WordleInstance: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    wordleAttempts.forEach(attempt => {
      if (teamFilter && attempt.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'wordle') return;

      activities.push({
        id: `wordle-${attempt.id}`,
        type: 'Wordle',
        member: `${attempt.Member.firstName} ${attempt.Member.lastName}`,
        memberId: attempt.Member.id,
        team: attempt.Member.Team?.name || 'No Team',
        teamId: attempt.Member.teamId,
        activity: `${attempt.WordleInstance.title} (${attempt.WordleInstance.BibleBook.name})`,
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
        Member: {
          include: {
            Team: true
          }
        },
        EmojiGame: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    emojiAttempts.forEach(attempt => {
      if (teamFilter && attempt.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'emoji') return;

      const assignedEmoji = JSON.parse(attempt.assignedEmoji);
      activities.push({
        id: `emoji-${attempt.id}`,
        type: 'Emoji Game',
        member: `${attempt.Member.firstName} ${attempt.Member.lastName}`,
        memberId: attempt.Member.id,
        team: attempt.Member.Team?.name || 'No Team',
        teamId: attempt.Member.teamId,
        activity: `${attempt.EmojiGame.title} (${attempt.EmojiGame.BibleBook.name})`,  
        details: `${attempt.isCorrect ? '✅ Correct' : '❌ Wrong'} | Answer: ${attempt.answer} | Correct: ${assignedEmoji.verse} | Points: ${attempt.points}`,
        pointsAwarded: attempt.points,
        timestamp: attempt.completedAt,
        icon: '😊'
      });
    });

    // 4. Verse Drop Attempts
    const verseDropAttempts = await prisma.verseDropAttempt.findMany({
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
        Member: {
          include: {
            Team: true
          }
        },
        VerseDropGame: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    verseDropAttempts.forEach(attempt => {
      if (teamFilter && attempt.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'versedrop') return;

      const assignedVerse = JSON.parse(attempt.assignedVerse);
      const completionRate = ((attempt.correctWords / attempt.totalWords) * 100).toFixed(0);
      activities.push({
        id: `versedrop-${attempt.id}`,
        type: 'Verse Drop',
        member: `${attempt.Member.firstName} ${attempt.Member.lastName}`,
        memberId: attempt.Member.id,
        team: attempt.Member.Team?.name || 'No Team',
        teamId: attempt.Member.teamId,
        activity: `${attempt.VerseDropGame.title} (${attempt.VerseDropGame.BibleBook.name})`,  
        details: `${completionRate}% complete | ${attempt.correctWords}/${attempt.totalWords} words | ${assignedVerse.ref} | Time: ${attempt.timeSpent}s | Points: ${attempt.points}`,
        pointsAwarded: attempt.points,
        timestamp: attempt.completedAt,
        icon: '💧'
      });
    });

    // 5. Flip Game Attempts
    const flipAttempts = await prisma.flipAttempt.findMany({
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
        Member: {
          include: {
            Team: true
          }
        },
        FlipGame: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    flipAttempts.forEach(attempt => {
      if (teamFilter && attempt.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'flip') return;

      const completionRate = ((attempt.pairsMatched / attempt.totalPairs) * 100).toFixed(0);
      const status = attempt.won ? '🏆 Won' : '⏰ Time Up';
      activities.push({
        id: `flip-${attempt.id}`,
        type: 'Flip Game',
        member: `${attempt.Member.firstName} ${attempt.Member.lastName}`,
        memberId: attempt.Member.id,
        team: attempt.Member.Team?.name || 'No Team',
        teamId: attempt.Member.teamId,
        activity: `${attempt.FlipGame.title} (${attempt.FlipGame.BibleBook.name})`,  
        details: `${status} | ${completionRate}% complete | ${attempt.pairsMatched}/${attempt.totalPairs} pairs | Moves: ${attempt.moves} | Time: ${attempt.timeSpent}s | Points: ${attempt.points}`,
        pointsAwarded: attempt.points,
        timestamp: attempt.completedAt,
        icon: '🎴'
      });
    });

    // 6. Reading Passage Completions (listening marker cards)
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
        Member: {
          include: {
            Team: true
          }
        },
        CollaborationWallSession: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    listeningCards.forEach(card => {
      if (teamFilter && card.Member.Team?.name !== teamFilter) return;
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
        member: `${card.Member.firstName} ${card.Member.lastName}`,
        memberId: card.Member.id,
        team: card.Member.Team?.name || 'No Team',
        teamId: card.Member.teamId,
        activity: `${card.CollaborationWallSession.title} (${card.CollaborationWallSession.BibleBook.name})`,
        details: `${status} | ${card.CollaborationWallSession.BibleBook.name} ${card.CollaborationWallSession.fromChapter}:${card.CollaborationWallSession.fromVerse} - ${card.CollaborationWallSession.toChapter}:${card.CollaborationWallSession.toVerse} | Points: ${points}`,    
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
        Member: {
          include: {
            Team: true
          }
        },
        CollaborationWallSession: {
          include: {
            BibleBook: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    insightCards.forEach(card => {
      if (teamFilter && card.Member.Team?.name !== teamFilter) return;
      if (activityType && activityType !== 'insight') return;

      activities.push({
        id: `insight-${card.id}`,
        type: 'Shared Insight',
        member: `${card.Member.firstName} ${card.Member.lastName}`,
        memberId: card.Member.id,
        team: card.Member.Team?.name || 'No Team',
        teamId: card.Member.teamId,
        activity: `${card.CollaborationWallSession.title}`,  
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
        versedrop: activities.filter(a => a.type === 'Verse Drop').length,
        flip: activities.filter(a => a.type === 'Flip Game').length,
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
