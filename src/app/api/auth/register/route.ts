import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email } = await request.json();

    // Validate input
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingMember = await prisma.member.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash the email as password
    const hashedPassword = await bcrypt.hash(email, 10);

    // Create the member (isApproved defaults to false, teamId is undefined)
    const member = await prisma.member.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isApproved: false,
      },
    });

    return NextResponse.json(
      {
        message: 'Registration successful! Please wait for admin approval.',
        member: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
