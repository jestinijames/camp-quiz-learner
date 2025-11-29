/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

import { cookies } from "next/headers";
import { verifyJwtNode } from "@/lib/jwt";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token")?.value;

    if (!authToken) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const decoded = verifyJwtNode(authToken) as any;

    if (decoded.isAdmin) {
      return NextResponse.json(
        { error: "Admins cannot take quizzes" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const quizId = parseInt(resolvedParams.quizId);

    // Check if quiz exists and is active
    const quiz = await prisma.quizInstance.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz || !quiz.isActive) {
      return NextResponse.json(
        { error: "Quiz not found or not active" },
        { status: 404 }
      );
    }

    // Check if user already has a session for this quiz
    const existingSession = await prisma.quizSession.findFirst({
      where: {
        quizId: quizId,
        memberId: decoded.id,
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: "You have already taken this quiz" },
        { status: 400 }
      );
    }

    // Randomly select questions: 1 of each type
    const fillInBlankQuestions = quiz.questions.filter(
      (q) => q.type === "FILL_IN_BLANK"
    );
    const multipleChoiceQuestions = quiz.questions.filter(
      (q) => q.type === "MULTIPLE_CHOICE"
    );
    const descriptiveQuestions = quiz.questions.filter(
      (q) => q.type === "DESCRIPTIVE"
    );

    // Random selection
    const selectedQuestions = [
      fillInBlankQuestions[
        Math.floor(Math.random() * fillInBlankQuestions.length)
      ],
      multipleChoiceQuestions[
        Math.floor(Math.random() * multipleChoiceQuestions.length)
      ],
      descriptiveQuestions[
        Math.floor(Math.random() * descriptiveQuestions.length)
      ],
    ].filter(Boolean); // Remove any undefined

    if (selectedQuestions.length !== 3) {
      return NextResponse.json(
        {
          error: "Quiz does not have enough questions of each type",
        },
        { status: 400 }
      );
    }

    // Create quiz session
    const session = await prisma.quizSession.create({
      data: {
        quizId: quizId,
        memberId: decoded.id,
        isSubmitted: false,
      },
    });

    // Track which questions this user got
    await prisma.questionUsage.createMany({
      data: selectedQuestions.map((q) => ({
        sessionId: session.id,
        questionId: q.id,
      })),
    });

    // Format questions for frontend (hide answers)
    const questionsForFrontend = selectedQuestions.map((q, index) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options,
      points: q.points,
      order: index + 1,
      verseRef: q.verseRef,
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        startTime: session.startedAt,
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        questions: questionsForFrontend,
      },
    });
  } catch (error) {
    console.error("Error starting quiz session:", error);
    return NextResponse.json(
      { error: "Failed to start quiz session" },
      { status: 500 }
    );
  }
}
