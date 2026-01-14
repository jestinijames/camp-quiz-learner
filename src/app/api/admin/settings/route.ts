/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '@/lib/jwt';
import { prisma } from '../../../../../lib/prisma';

// GET - Fetch current global settings
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    // Check if admin
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get or create settings (singleton pattern)
    let settings = await prisma.globalSettings.findFirst();
    
    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.globalSettings.create({
        data: {
          id: 1,
          sessionActive: true,
          sessionMessage: 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.',
          updatedAt: new Date(),
        }
      });
    }

    return NextResponse.json({ settings });

  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update global settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    
    // Check if admin
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sessionActive, sessionMessage } = await request.json();

    // Update or create settings
    const settings = await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: {
        sessionActive,
        sessionMessage: sessionMessage || 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.',
        updatedBy: decoded.id,
      },
      create: {
        id: 1,
        sessionActive,
        sessionMessage: sessionMessage || 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.',
        updatedBy: decoded.id,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ 
      success: true,
      settings,
      message: `Session status updated: ${sessionActive ? 'Active' : 'Closed'}`
    });

  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      error: 'Failed to update settings',
      details: error.message 
    }, { status: 500 });
  }
}
