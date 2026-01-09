import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';


// GET - Public endpoint to check session status
export async function GET() {
  try {
    let settings = await prisma.globalSettings.findFirst();
    
    if (!settings) {
      // If no settings exist, create default (session active)
      settings = await prisma.globalSettings.create({
        data: {
          id: 1,
          sessionActive: true,
          sessionMessage: 'This session is now closed. Submissions are no longer accepted. Please be patient until the next session starts.',
        }
      });
    }

    return NextResponse.json({ 
      sessionActive: settings.sessionActive,
      sessionMessage: settings.sessionMessage
    });

  } catch (error) {
    console.error('Error fetching session status:', error);
    // On error, default to session active to avoid blocking users
    return NextResponse.json({ 
      sessionActive: true,
      sessionMessage: ''
    });
  }
}
