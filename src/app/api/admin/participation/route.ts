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

    // Get date filter from query params
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');
    
    // Build date filter for queries
    let dateWhere = {};
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));
      dateWhere = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Get all members with their teams
    const members = await prisma.member.findMany({
      include: {
        Team: true,
      },
      orderBy: [
        { teamId: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Get all participation data with points
    const [quizData, wordleData, emojiData, verseDropData, flipData, readingData, insightData] = await Promise.all([
      // Quiz participation with points
      prisma.quizSession.findMany({
        where: {
          isSubmitted: true,
          totalScore: { not: null },
          ...(dateFilter ? { completedAt: dateWhere } : {}),
        },
        select: {
          memberId: true,
          totalScore: true,
        },
      }),
      
      // Wordle participation with points
      prisma.wordleAttempt.findMany({
        where: {
          completed: true,
          ...(dateFilter ? { completedAt: dateWhere } : {}),
        },
        select: {
          memberId: true,
          points: true,
        },
      }),
      
      // Emoji participation with points
      prisma.emojiAttempt.findMany({
        where: {
          completed: true,
          ...(dateFilter ? { completedAt: dateWhere } : {}),
        },
        select: {
          memberId: true,
          points: true,
        },
      }),
      
      // Verse Drop participation with points
      prisma.verseDropAttempt.findMany({
        where: {
          completed: true,
          ...(dateFilter ? { completedAt: dateWhere } : {}),
        },
        select: {
          memberId: true,
          points: true,
        },
      }),

      // Flip Game participation with points
      prisma.flipAttempt.findMany({
        where: {
          completed: true,
          ...(dateFilter ? { completedAt: dateWhere } : {}),
        },
        select: {
          memberId: true,
          points: true,
        },
      }),

      // Reading Passage completions (listening marker cards)
      prisma.collaborationCard.findMany({
        where: {
          OR: [
            { content: '__LISTENING_COMPLETION__' },
            { content: '__LISTENING_SKIPPED__' }
          ],
          ...(dateFilter ? { createdAt: dateWhere } : {}),
        },
        select: {
          authorId: true,
          content: true,
          pointsAwarded: true,
        },
      }),

      // Shared Insights (first collaboration cards that got points)
      prisma.collaborationCard.findMany({
        where: {
          pointsAwarded: true,
          content: {
            not: '__LISTENING_COMPLETION__',
          },
          ...(dateFilter ? { createdAt: dateWhere } : {}),
        },
        select: {
          authorId: true,
        },
      }),
    ]);

    // Aggregate points by member for each activity
    const quizPointsByMember = new Map<number, number>();
    quizData.forEach(item => {
      const current = quizPointsByMember.get(item.memberId) || 0;
      quizPointsByMember.set(item.memberId, current + (item.totalScore || 0));
    });

    const wordlePointsByMember = new Map<number, number>();
    wordleData.forEach(item => {
      const current = wordlePointsByMember.get(item.memberId) || 0;
      wordlePointsByMember.set(item.memberId, current + item.points);
    });

    const emojiPointsByMember = new Map<number, number>();
    emojiData.forEach(item => {
      const current = emojiPointsByMember.get(item.memberId) || 0;
      emojiPointsByMember.set(item.memberId, current + item.points);
    });

    const verseDropPointsByMember = new Map<number, number>();
    verseDropData.forEach(item => {
      const current = verseDropPointsByMember.get(item.memberId) || 0;
      verseDropPointsByMember.set(item.memberId, current + item.points);
    });

    const flipPointsByMember = new Map<number, number>();
    flipData.forEach(item => {
      const current = flipPointsByMember.get(item.memberId) || 0;
      flipPointsByMember.set(item.memberId, current + item.points);
    });

    const readingPointsByMember = new Map<number, number>();
    readingData.forEach(item => {
      const current = readingPointsByMember.get(item.authorId) || 0;
      let points = 0;
      if (item.content === '__LISTENING_COMPLETION__' && item.pointsAwarded) {
        points = 4; // Completed listening
      } else if (item.content === '__LISTENING_SKIPPED__') {
        points = 1; // Skipped (read but didn't listen)
      }
      // Note: incomplete attempts (__LISTENING_COMPLETION__ with pointsAwarded=false) get 0 points
      readingPointsByMember.set(item.authorId, current + points);
    });

    const insightPointsByMember = new Map<number, number>();
    insightData.forEach(item => {
      const current = insightPointsByMember.get(item.authorId) || 0;
      insightPointsByMember.set(item.authorId, current + 2); // Fixed 2 points for first insight
    });

    // Build participation data
    const participationData = members.map(member => {
      const quizPoints = quizPointsByMember.get(member.id) || 0;
      const wordlePoints = wordlePointsByMember.get(member.id) || 0;
      const emojiPoints = emojiPointsByMember.get(member.id) || 0;
      const verseDropPoints = verseDropPointsByMember.get(member.id) || 0;
      const flipPoints = flipPointsByMember.get(member.id) || 0;
      const readingPoints = readingPointsByMember.get(member.id) || 0;
      const insightPoints = insightPointsByMember.get(member.id) || 0;
      
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        teamId: member.teamId,
        teamName: member.Team?.name || 'No Team',
        quiz: quizPoints,
        wordle: wordlePoints,
        emoji: emojiPoints,
        verseDrop: verseDropPoints,
        flip: flipPoints,
        reading: readingPoints,
        insight: insightPoints,
        totalPoints: quizPoints + wordlePoints + emojiPoints + verseDropPoints + flipPoints + readingPoints + insightPoints,
        totalActivities: [
          quizPoints > 0,
          wordlePoints > 0,
          emojiPoints > 0,
          verseDropPoints > 0,
          flipPoints > 0,
          readingPoints > 0,
          insightPoints > 0,
        ].filter(Boolean).length,
      };
    });

    // Calculate summary stats
    const summary = {
      totalMembers: members.length,
      quizParticipation: quizPointsByMember.size,
      wordleParticipation: wordlePointsByMember.size,
      emojiParticipation: emojiPointsByMember.size,
      verseDropParticipation: verseDropPointsByMember.size,
      flipParticipation: flipPointsByMember.size,
      readingParticipation: readingPointsByMember.size,
      insightParticipation: insightPointsByMember.size,
      fullyParticipated: participationData.filter(m => m.totalActivities === 7).length,
      notParticipated: participationData.filter(m => m.totalActivities === 0).length,
      totalQuizPoints: Array.from(quizPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalWordlePoints: Array.from(wordlePointsByMember.values()).reduce((a, b) => a + b, 0),
      totalEmojiPoints: Array.from(emojiPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalVerseDropPoints: Array.from(verseDropPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalFlipPoints: Array.from(flipPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalReadingPoints: Array.from(readingPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalInsightPoints: Array.from(insightPointsByMember.values()).reduce((a, b) => a + b, 0),
    };

    // Get unique teams for filtering with manual points
    const uniqueTeamNames = [...new Set(members.map(m => m.Team?.name).filter(Boolean))] as string[];
    
    // Get team manual points
    const teamsWithPoints = await prisma.team.findMany({
      where: {
        name: { in: uniqueTeamNames }
      },
      select: {
        name: true,
        manualPoints: true
      }
    });

    const teamManualPoints = teamsWithPoints.reduce((acc, team) => {
      acc[team.name] = team.manualPoints || 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      participation: participationData,
      summary,
      teams: uniqueTeamNames.sort(),
      teamManualPoints,
    });

  } catch (error) {
    console.error('Error fetching participation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participation data' },
      { status: 500 }
    );
  }
}
