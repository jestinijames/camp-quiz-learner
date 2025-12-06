/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/quiz/[quizId]/correct-all/route.ts
import { NextResponse } from 'next/server';
import { verifyJwtNode } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../../lib/prisma';
import { correctDescriptiveAnswer } from '../../../../../../../lib/ollamaCorrection';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
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

    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // FIXED: Look for descriptive answers with "Awaiting manual review" feedback
    const uncorrectedAnswers = await prisma.answer.findMany({
      where: {
        session: { 
          quizId,
          isSubmitted: true
        },
        question: { type: 'DESCRIPTIVE' },
        feedback: 'Awaiting manual review' // ✅ This matches your database
      },
      include: {
        question: true,
        session: {
          include: {
            member: true
          }
        }
      }
    });

    console.log(`Found ${uncorrectedAnswers.length} uncorrected descriptive answers for quiz ${quizId}`);

    let corrected = 0;
    const errors: string[] = [];

    // Correct each answer
    for (const answer of uncorrectedAnswers) {
      try {
        console.log(`Correcting answer ${answer.id} for ${answer.session.member.name}`);
        
        const correction = await correctDescriptiveAnswer(
          answer.question.text,
          answer.question.answer,
          answer.response,
          answer.question.points,
          answer.question.verseRef || ''
        );

        // Update answer with correction
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            points: correction.points,
            isCorrect: correction.isCorrect,
            feedback: correction.feedback
          }
        });

        console.log(`Successfully corrected answer ${answer.id}: ${correction.points} points`);
        corrected++;
        
      } catch (error: any) {
        console.error(`Failed to correct answer ${answer.id}:`, error);
        errors.push(`Failed to correct answer for ${answer.session.member.name}: ${error.message}`);
      }
    }

    console.log(`Correction complete: ${corrected} corrected, ${errors.length} errors`);

    // Recalculate total scores for affected sessions
    const affectedSessionIds = [...new Set(uncorrectedAnswers.map(a => a.sessionId))];
    
    for (const sessionId of affectedSessionIds) {
      const sessionAnswers = await prisma.answer.findMany({
        where: { sessionId },
        include: { question: true }
      });

      const totalScore = sessionAnswers.reduce((sum, answer) => 
        sum + (answer.points || 0), 0
      );

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { totalScore }
      });

      console.log(`Updated session ${sessionId} total score: ${totalScore}`);
    }

    return NextResponse.json({
      corrected,
      errors,
      foundAnswers: uncorrectedAnswers.length
    });

  } catch (error: any) {
    console.error('Auto-correction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// FIXED: Helper function to update team scores
async function updateTeamScores(quizId: number) {
  // Get all quiz sessions with member and team info
  const sessions = await prisma.quizSession.findMany({
    where: { 
      quizId, 
      isSubmitted: true,
      totalScore: { not: null }
    },
    include: {
      member: {
        include: { team: true }
      }
    }
  });

  // Group by team and calculate totals
  const teamTotals = new Map();
  
  sessions.forEach(session => {
    const teamId = session.member.teamId;
    const teamName = session.member.team.name;
    
    if (!teamTotals.has(teamId)) {
      teamTotals.set(teamId, {
        teamId,
        teamName,
        totalScore: 0,
        memberCount: 0
      });
    }
    
    const teamData = teamTotals.get(teamId);
    teamData.totalScore += session.totalScore || 0;
    teamData.memberCount += 1;
  });

  // Log team scores (you can save to a TeamScore table if needed)
  console.log('Updated team scores:', Array.from(teamTotals.values()));
  
  // If you want to save team scores, add a TeamScore model to schema and save here
}