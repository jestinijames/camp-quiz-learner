import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';
import { signJwt } from '@/lib/jwt';


export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Admin login
    if ('isAdmin' in body && body.isAdmin) {
      const { username, password } = body;

      const admin = await prisma.admin.findUnique({
        where: { username }
      });

      if (!admin) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const token = signJwt({
        id: admin.id,
        isAdmin: true
      });

      const userData = {
        id: admin.id,
        name: admin.username,
        isAdmin: true,
        team: null
      };

      const response = NextResponse.json(userData);

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
      });

      return response;
    }

    // Team member login
    const { teamName, password, memberName } = body;

    const team = await prisma.team.findUnique({
      where: { name: teamName },
      include: { members: true }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Invalid team credentials' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, team.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid team credentials' },
        { status: 401 }
      );
    }

    // Check if member exists or create new member
    let member = team.members.find(m => m.name === memberName);
    
    if (!member) {
      member = await prisma.member.create({
        data: {
          name: memberName,
          teamId: team.id
        }
      });
    }

    const token = signJwt({
      id: member.id,
      isAdmin: false
    });

    const userData = {
      id: member.id,
      name: member.name,
      isAdmin: false,
      team: {
        id: team.id,
        name: team.name
      }
    };

    const response = NextResponse.json(userData);

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}