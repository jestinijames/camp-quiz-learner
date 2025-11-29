/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // Get quiz with verse range info
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: {
        book: {
          include: {
            version: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get the specific verse range for this quiz
    const verses = await prisma.bibleVerse.findMany({
      where: {
        chapter: {
          book: {
            id: quiz.bookId
          },
          number: {
            gte: quiz.fromChapter,
            lte: quiz.toChapter
          }
        },
        OR: [
          // First chapter: verses from fromVerse onwards
          {
            chapter: {
              number: quiz.fromChapter
            },
            number: {
              gte: quiz.fromVerse
            }
          },
          // Middle chapters: all verses (if fromChapter != toChapter)
          ...(quiz.fromChapter !== quiz.toChapter ? [{
            chapter: {
              number: {
                gt: quiz.fromChapter,
                lt: quiz.toChapter
              }
            }
          }] : []),
          // Last chapter: verses up to toVerse (if different from first chapter)
          ...(quiz.fromChapter !== quiz.toChapter ? [{
            chapter: {
              number: quiz.toChapter
            },
            number: {
              lte: quiz.toVerse
            }
          }] : []),
          // Same chapter: handle range within same chapter
          ...(quiz.fromChapter === quiz.toChapter ? [{
            chapter: {
              number: quiz.fromChapter
            },
            number: {
              gte: quiz.fromVerse,
              lte: quiz.toVerse
            }
          }] : [])
        ]
      },
      include: {
        chapter: true
      },
      orderBy: [
        { chapter: { number: 'asc' } },
        { number: 'asc' }
      ]
    });

    // Group verses by chapter for better display
    const chapters: any = {};
    verses.forEach(verse => {
      const chapterNum = verse.chapter.number;
      if (!chapters[chapterNum]) {
        chapters[chapterNum] = {
          id: verse.chapter.id,
          number: chapterNum,
          verses: []
        };
      }
      chapters[chapterNum].verses.push({
        id: verse.id,
        number: verse.number,
        text: verse.text
      });
    });

    const formattedBook = {
      ...quiz.book,
      chapters: Object.values(chapters)
    };

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        book: formattedBook,
        timeLimit: quiz.timeLimit
      }
    });

  } catch (error) {
    console.error('Error fetching quiz verses:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz verses' }, { status: 500 });
  }
}