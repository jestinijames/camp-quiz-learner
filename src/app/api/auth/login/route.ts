import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';
import { signJwt } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Admin login (unchanged)
    if ('isAdmin' in body && body.isAdmin) {
      const { username, password } = body;
      const admin = await prisma.admin.findUnique({ where: { username } });
      if (!admin) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = signJwt({ id: admin.id, isAdmin: true });
      const userData = { id: admin.id, name: admin.username, isAdmin: true, team: null };
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

    // Member login by email and password (first name, case-insensitive)
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const member = await prisma.member.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { team: true }
    });
    if (!member) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    // Compare password (first name, case-insensitive, hashed)
    const isPasswordValid = await bcrypt.compare(password.trim().toLowerCase(), member.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const token = signJwt({ id: member.id, isAdmin: false });
    const userData = {
      id: member.id,
      name: member.firstName,
      isAdmin: false,
      team: member.team ? { id: member.team.id, name: member.team.name } : null
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
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}