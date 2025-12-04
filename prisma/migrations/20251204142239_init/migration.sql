/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `quizSessionId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `QuizSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionId,questionId]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[quizId,memberId]` on the table `QuizSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Question` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `adminId` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromChapter` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromVerse` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toChapter` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toVerse` to the `QuizInstance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('FILL_IN_BLANK', 'MULTIPLE_CHOICE', 'DESCRIPTIVE');

-- CreateEnum
CREATE TYPE "TriviaType" AS ENUM ('INSIGHT', 'ENCOURAGEMENT', 'STUDY_TIP', 'BIBLICAL_CONNECTION', 'COMMON_MISTAKE', 'CHALLENGE');

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_quizSessionId_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "createdAt",
DROP COLUMN "quizSessionId",
DROP COLUMN "score",
ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "points" INTEGER,
ADD COLUMN     "sessionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "verseRef" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "QuestionType" NOT NULL;

-- AlterTable
ALTER TABLE "QuizInstance" ADD COLUMN     "adminId" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fromChapter" INTEGER NOT NULL,
ADD COLUMN     "fromVerse" INTEGER NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeLimit" INTEGER,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "toChapter" INTEGER NOT NULL,
ADD COLUMN     "toVerse" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "QuizSession" DROP COLUMN "startedAt",
ADD COLUMN     "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "timeSpent" INTEGER,
ADD COLUMN     "totalScore" INTEGER;

-- CreateTable
CREATE TABLE "QuestionUsage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "QuestionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaItem" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "memberId" INTEGER,
    "questionId" INTEGER,
    "type" "TriviaType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "insight" TEXT,
    "suggestedReading" TEXT,
    "studyTips" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,

    CONSTRAINT "TriviaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaView" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "triviaId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriviaView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordleInstance" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "fromChapter" INTEGER NOT NULL,
    "fromVerse" INTEGER NOT NULL,
    "toChapter" INTEGER NOT NULL,
    "toVerse" INTEGER NOT NULL,
    "hint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,

    CONSTRAINT "WordleInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordleAttempt" (
    "id" SERIAL NOT NULL,
    "wordleId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "guesses" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER,
    "completedAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WordleAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionUsage_sessionId_questionId_key" ON "QuestionUsage"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaView_memberId_triviaId_key" ON "TriviaView"("memberId", "triviaId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "WordleAttempt_wordleId_memberId_key" ON "WordleAttempt"("wordleId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sessionId_questionId_key" ON "Answer"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSession_quizId_memberId_key" ON "QuizSession"("quizId", "memberId");

-- AddForeignKey
ALTER TABLE "QuizInstance" ADD CONSTRAINT "QuizInstance_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionUsage" ADD CONSTRAINT "QuestionUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionUsage" ADD CONSTRAINT "QuestionUsage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaItem" ADD CONSTRAINT "TriviaItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "QuizInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaItem" ADD CONSTRAINT "TriviaItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaItem" ADD CONSTRAINT "TriviaItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaItem" ADD CONSTRAINT "TriviaItem_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaView" ADD CONSTRAINT "TriviaView_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaView" ADD CONSTRAINT "TriviaView_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "TriviaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordleInstance" ADD CONSTRAINT "WordleInstance_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordleInstance" ADD CONSTRAINT "WordleInstance_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordleAttempt" ADD CONSTRAINT "WordleAttempt_wordleId_fkey" FOREIGN KEY ("wordleId") REFERENCES "WordleInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordleAttempt" ADD CONSTRAINT "WordleAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
