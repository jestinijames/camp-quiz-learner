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

    // Get active quizzes that the member hasn't taken yet
    const activeQuizzes = await prisma.quizInstance.findMany({
      where: {
        isActive: true,
        quizSessions: {
          none: {
            memberId: decoded.id,
            isSubmitted: true
          }
        }
      },
      include: {
        book: {
          include: {
            version: true
          }
        },
        _count: {
          select: {
            questions: true,
            quizSessions: {
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

    return NextResponse.json(activeQuizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}