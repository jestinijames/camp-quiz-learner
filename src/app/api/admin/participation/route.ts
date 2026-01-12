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

    // Get all members with their teams
    const members = await prisma.member.findMany({
      include: {
        team: true,
      },
      orderBy: [
        { teamId: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Get all participation data with points
    const [quizData, wordleData, emojiData, verseDropData, readingData, insightData] = await Promise.all([
      // Quiz participation with points
      prisma.quizSession.findMany({
        where: {
          isSubmitted: true,
          totalScore: { not: null },
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
        },
        select: {
          memberId: true,
          points: true,
        },
      }),

      // Reading Passage completions (listening marker cards)
      prisma.collaborationCard.findMany({
        where: {
          content: '__LISTENING_COMPLETION__',
        },
        select: {
          authorId: true,
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

    const readingPointsByMember = new Map<number, number>();
    readingData.forEach(item => {
      const current = readingPointsByMember.get(item.authorId) || 0;
      const points = item.pointsAwarded ? 4 : 1; // 4 points for completed, 1 for skipped
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
      const readingPoints = readingPointsByMember.get(member.id) || 0;
      const insightPoints = insightPointsByMember.get(member.id) || 0;
      
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        teamId: member.teamId,
        teamName: member.team?.name || 'No Team',
        quiz: quizPoints,
        wordle: wordlePoints,
        emoji: emojiPoints,
        verseDrop: verseDropPoints,
        reading: readingPoints,
        insight: insightPoints,
        totalPoints: quizPoints + wordlePoints + emojiPoints + verseDropPoints + readingPoints + insightPoints,
        totalActivities: [
          quizPoints > 0,
          wordlePoints > 0,
          emojiPoints > 0,
          verseDropPoints > 0,
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
      readingParticipation: readingPointsByMember.size,
      insightParticipation: insightPointsByMember.size,
      fullyParticipated: participationData.filter(m => m.totalActivities === 6).length,
      notParticipated: participationData.filter(m => m.totalActivities === 0).length,
      totalQuizPoints: Array.from(quizPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalWordlePoints: Array.from(wordlePointsByMember.values()).reduce((a, b) => a + b, 0),
      totalEmojiPoints: Array.from(emojiPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalVerseDropPoints: Array.from(verseDropPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalReadingPoints: Array.from(readingPointsByMember.values()).reduce((a, b) => a + b, 0),
      totalInsightPoints: Array.from(insightPointsByMember.values()).reduce((a, b) => a + b, 0),
    };

    // Get unique teams for filtering
    const teams = [...new Set(members.map(m => m.team?.name).filter(Boolean))].sort();

    return NextResponse.json({
      success: true,
      participation: participationData,
      summary,
      teams,
    });

  } catch (error) {
    console.error('Error fetching participation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participation data' },
      { status: 500 }
    );
  }
}
