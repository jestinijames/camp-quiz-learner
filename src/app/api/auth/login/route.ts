import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';
import { signJwt } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Legacy admin login (for backward compatibility)
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

    // Unified login - auto-detect admin or member
    const { identifier: rawIdentifier, password, email, username } = body;
    
    // Support both old format (email/username) and new format (identifier)
    const identifier = rawIdentifier || email || username;
    
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
    }

    // Try admin login first (check if identifier matches an admin username)
    const admin = await prisma.admin.findUnique({ 
      where: { username: identifier.trim() } 
    });
    
    if (admin) {
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (isPasswordValid) {
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
    }

    // If not admin, try member login by email
    const member = await prisma.member.findUnique({
      where: { email: identifier.toLowerCase().trim() },
      include: { team: true }
    });
    
    if (member) {
      // Compare password (email, hashed)
      const isPasswordValid = await bcrypt.compare(password.trim().toLowerCase(), member.password);
      if (isPasswordValid) {
        const token = signJwt({ id: member.id, isAdmin: false });
        const userData = {
          id: member.id,
          name: member.firstName,
          isAdmin: false,
          isApproved: member.isApproved,
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
      }
    }

    // If we get here, credentials were invalid
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}