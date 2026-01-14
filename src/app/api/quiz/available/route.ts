/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;

    if (decoded.isAdmin) {
      return NextResponse.json({ error: 'Member access only' }, { status: 403 });
    }

    // Get active quizzes that the member hasn't submitted yet
    const activeQuizzes = await prisma.quizInstance.findMany({
      where: {
        isActive: true,
        QuizSession: {
          none: {
            memberId: decoded.id,
            isSubmitted: true // Only exclude if they've submitted
          }
        }
      },
      include: {
        BibleBook: {
          include: {
            BibleVersion: true
          }
        },
        _count: {
          select: {
            Question: true,
            QuizSession: {
              where: {
                isSubmitted: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    const response = NextResponse.json(activeQuizzes);
    // Prevent caching to ensure users always see current quiz availability
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}