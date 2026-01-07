/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { verifyJwtNode } from '../../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../lib/prisma';

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

    const { 
      title, 
      description, 
      bookId, 
      timeLimit, 
      isActive,
      fromChapter,
      fromVerse, 
      toChapter,
      toVerse,
      questions 
    } = await request.json();

    // Basic validation
    if (!title || !bookId || !fromChapter || !fromVerse || !toChapter || !toVerse) {
      return NextResponse.json({ 
        error: 'Title, book, and verse range are required' 
      }, { status: 400 });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ 
        error: 'At least one question is required' 
      }, { status: 400 });
    }

    // Updated validation for AI-generated quizzes (45 questions) or manual quizzes (3 questions)
    const isAIGenerated = questions.length === 45;
    const isManualQuiz = questions.length === 3;

    if (!isAIGenerated && !isManualQuiz) {
      return NextResponse.json({ 
        error: `Invalid number of questions. Expected 3 (manual) or 45 (AI-generated), got ${questions.length}` 
      }, { status: 400 });
    }

    // For AI-generated quizzes, validate we have 15 of each type
    if (isAIGenerated) {
      const fillInBlank = questions.filter(q => q.type === 'FILL_IN_BLANK').length;
      const multipleChoice = questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
      const descriptive = questions.filter(q => q.type === 'DESCRIPTIVE').length;

      if (fillInBlank !== 15 || multipleChoice !== 15 || descriptive !== 15) {
        return NextResponse.json({ 
          error: `AI-generated quiz must have exactly 15 of each question type. Got: ${fillInBlank} fill-in-blank, ${multipleChoice} multiple choice, ${descriptive} descriptive` 
        }, { status: 400 });
      }
    }

    // For manual quizzes, validate we have exactly 1 of each type
    if (isManualQuiz) {
      const types = questions.map(q => q.type);
      const hasAllTypes = types.includes('FILL_IN_BLANK') && 
                         types.includes('MULTIPLE_CHOICE') && 
                         types.includes('DESCRIPTIVE');
      
      if (!hasAllTypes || new Set(types).size !== 3) {
        return NextResponse.json({ 
          error: 'Manual quiz must have exactly 1 fill-in-blank, 1 multiple choice, and 1 descriptive question' 
        }, { status: 400 });
      }
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.text || !q.answer) {
        return NextResponse.json({ 
          error: `Question ${i + 1} is missing text or answer` 
        }, { status: 400 });
      }

      if (q.type === 'MULTIPLE_CHOICE') {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 4) {
          return NextResponse.json({ 
            error: `Question ${i + 1} (multiple choice) must have at least 4 options` 
          }, { status: 400 });
        }
        
        // Check if answer is one of the options
        const optionsArray = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        if (!optionsArray.includes(q.answer)) {
          return NextResponse.json({ 
            error: `Question ${i + 1} answer must be one of the provided options` 
          }, { status: 400 });
        }
      }
    }

    // Create the quiz
    const quiz = await prisma.quizInstance.create({
      data: {
        title,
        description: description || null,
        bookId: parseInt(bookId),
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        isActive: isActive ?? true,
        fromChapter: parseInt(fromChapter),
        fromVerse: parseInt(fromVerse),
        toChapter: parseInt(toChapter),
        toVerse: parseInt(toVerse),
        adminId: decoded.id,
      }
    });

    // Create all questions
    const questionData = questions.map((q: any, index: number) => ({
      quizId: quiz.id,
      type: q.type,
      text: q.text,
      options: q.type === 'MULTIPLE_CHOICE' ? 
        (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : 
        null,
      answer: q.answer,
      points: q.points || 10,
      order: index + 1,
      verseRef: q.verseRef || null
    }));

    await prisma.question.createMany({
      data: questionData
    });

    return NextResponse.json({ 
      success: true, 
      quizId: quiz.id,
      questionCount: questions.length,
      type: isAIGenerated ? 'AI-generated' : 'manual'
    });

  } catch (error: any) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ 
      error: `Failed to create quiz: ${error.message}` 
    }, { status: 500 });
  }
}