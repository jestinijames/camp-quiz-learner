import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';


export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: { 
        members: {
          select: {
            id: true,
            firstName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { teams } = await request.json();

    // Validate input
    if (!Array.isArray(teams)) {
      return NextResponse.json(
        { error: 'Teams must be an array' },
        { status: 400 }
      );
    }

    // Delete existing teams and their members (cascading delete)
    await prisma.team.deleteMany();

    // Create new teams with members
    for (const team of teams) {
      if (!team.name || !team.password) {
        continue; // Skip invalid teams
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(team.password, 10);

      // Filter out empty member names
      const validMembers = team.members?.filter((m: { firstName: string; email: string }) => m.firstName.trim() && m.email.trim()) || [];

      await prisma.team.create({
        data: {
          name: team.name.trim(),
          members: {
            create: validMembers.map((m: { firstName: string; email: string }) => ({
              firstName: m.firstName.trim(),
              email: m.email.trim(),
              password: hashedPassword
            }))
          }
        }
      });
    }

    return NextResponse.json({ status: 'success', message: 'Teams saved successfully' });
  } catch (error) {
    console.error('Error saving teams:', error);
    return NextResponse.json(
      { error: 'Failed to save teams' },
      { status: 500 }
    );
  }
}
