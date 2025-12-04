/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtNode } from '../../../../../lib/jwt';
import { generateWordleFromScripture } from '../../../../../../lib/wordleGenerator';


export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { bookId, fromChapter, fromVerse, toChapter, toVerse } = await request.json();

    // Generate new word
    const newWord = await generateWordleFromScripture(
      parseInt(bookId), 
      parseInt(fromChapter), 
      parseInt(fromVerse), 
      parseInt(toChapter), 
      parseInt(toVerse)
    );

    return NextResponse.json({
      word: newWord.toUpperCase()
    });

  } catch (error: any) {
    console.error('Error regenerating word:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}