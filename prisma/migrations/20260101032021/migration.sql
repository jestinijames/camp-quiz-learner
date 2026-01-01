/*
  Warnings:

  - You are about to drop the column `name` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `word` on the `WordleInstance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Member` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedWord` to the `WordleAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wordPool` to the `WordleInstance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "name",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "password";

-- AlterTable
ALTER TABLE "TriviaItem" ADD COLUMN     "sessionId" INTEGER;

-- AlterTable
ALTER TABLE "WordleAttempt" ADD COLUMN     "assignedWord" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WordleInstance" DROP COLUMN "word",
ADD COLUMN     "wordPool" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EmojiGame" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "emojiPool" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "fromChapter" INTEGER NOT NULL,
    "fromVerse" INTEGER NOT NULL,
    "toChapter" INTEGER NOT NULL,
    "toVerse" INTEGER NOT NULL,
    "hint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,

    CONSTRAINT "EmojiGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmojiAttempt" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "assignedEmoji" TEXT NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER,
    "completedAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmojiAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmojiAttempt_gameId_memberId_key" ON "EmojiAttempt"("gameId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- AddForeignKey
ALTER TABLE "TriviaItem" ADD CONSTRAINT "TriviaItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiGame" ADD CONSTRAINT "EmojiGame_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiGame" ADD CONSTRAINT "EmojiGame_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiAttempt" ADD CONSTRAINT "EmojiAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EmojiGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmojiAttempt" ADD CONSTRAINT "EmojiAttempt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
