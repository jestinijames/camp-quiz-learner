/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';


import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;

    console.log(`🔐 Decoded token for member: ${decoded.id}`);
    
    // Find current member
    const member = await prisma.member.findFirst({
      where: { id: decoded.id }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    console.log(`🔍 Searching trivia for member ${member.name} (ID: ${member.id})`);

    // Get personal trivia for this member
    const personalTrivia = await prisma.triviaItem.findMany({
      where: {
        OR: [
          { memberId: member.id },           // Assigned to this member
          { 
            AND: [
              { memberId: null },             // Not assigned to anyone
              { quiz: { 
                quizSessions: { 
                  some: { memberId: member.id } 
                }
              }}
            ]
          }
        ],
        isPublished: true
      },
      include: {
        quiz: {
          include: { book: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`🎯 Found ${personalTrivia.length} trivia items for ${member.name}`);

    // FIXED: Return just the array, not an object
    return NextResponse.json(personalTrivia);

  } catch (error: any) {
    console.error('❌ Error fetching personal trivia:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}